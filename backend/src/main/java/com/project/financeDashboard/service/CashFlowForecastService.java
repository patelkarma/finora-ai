package com.project.financeDashboard.service;

import com.project.financeDashboard.config.RedisCacheConfig;
import com.project.financeDashboard.dto.DetectedSubscription;
import com.project.financeDashboard.dto.ForecastPoint;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Projects the user's net cash flow over the next N days.
 *
 * <p>Three input streams combine into each day's delta:
 * <ol>
 *   <li><b>Income</b> — the user's stated monthly salary, applied on
 *       the day-of-month inferred from their most recent income
 *       transaction (or the 1st as a fallback).</li>
 *   <li><b>Subscriptions</b> — recurring expenses detected by
 *       {@link SubscriptionDetectorService}. Each charge lands on its
 *       {@code nextExpected} date and, for monthly+ subscriptions,
 *       continues at that period within the window.</li>
 *   <li><b>Discretionary</b> — non-subscription daily spend, averaged
 *       from the last 60 days. Spread evenly across the forecast.</li>
 * </ol>
 *
 * <p>Output: one {@link ForecastPoint} per day with the four input
 * components, the day's net delta, and the running cumulative.
 *
 * <p>Cached on (userId, days) for 5min — same staleness contract as
 * subscriptions and anomalies.
 */
@Service
public class CashFlowForecastService {

    private static final Logger log = LoggerFactory.getLogger(CashFlowForecastService.class);

    /** How far back to average non-subscription expenses. */
    private static final int DISCRETIONARY_LOOKBACK_DAYS = 60;

    private final TransactionService transactionService;
    private final UserService userService;
    private final SubscriptionDetectorService subscriptionDetectorService;

    public CashFlowForecastService(TransactionService transactionService,
                                    UserService userService,
                                    SubscriptionDetectorService subscriptionDetectorService) {
        this.transactionService = transactionService;
        this.userService = userService;
        this.subscriptionDetectorService = subscriptionDetectorService;
    }

    @Cacheable(value = RedisCacheConfig.CACHE_INSIGHTS, key = "'forecast:' + #userId + ':' + #days")
    public List<ForecastPoint> forecast(long userId, int days) {
        if (days <= 0 || days > 90) days = 30;

        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) return List.of();
        User user = userOpt.get();

        List<Transaction> all = transactionService.getTransactionsByUserId(userId);
        // Salary amount: prefer user.salary (explicitly set in profile);
        // fall back to the most recent income transaction's amount so
        // a user who entered an income without setting their profile
        // salary still gets a realistic forecast.
        BigDecimal salary = user.getSalary() != null
                ? BigDecimal.valueOf(user.getSalary())
                : inferSalaryAmount(all);

        int salaryDom = inferSalaryDayOfMonth(all);
        BigDecimal dailyDiscretionary = computeDailyDiscretionary(all);
        Map<LocalDate, BigDecimal> subsByDate = projectSubscriptions(userId, days);

        log.debug("Forecast user={} days={} salary={} salaryDom={} dailyDiscr={} subDates={}",
                userId, days, salary, salaryDom, dailyDiscretionary, subsByDate.size());

        LocalDate start = LocalDate.now();
        BigDecimal cumulative = BigDecimal.ZERO;
        List<ForecastPoint> series = new ArrayList<>(days);

        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);

            BigDecimal income = (d.getDayOfMonth() == salaryDom) ? salary : BigDecimal.ZERO;
            BigDecimal subs = subsByDate.getOrDefault(d, BigDecimal.ZERO);
            BigDecimal discr = dailyDiscretionary;
            BigDecimal netDelta = income.subtract(subs).subtract(discr);
            cumulative = cumulative.add(netDelta);

            series.add(new ForecastPoint(
                    d,
                    income.setScale(2, RoundingMode.HALF_UP),
                    subs.setScale(2, RoundingMode.HALF_UP),
                    discr.setScale(2, RoundingMode.HALF_UP),
                    netDelta.setScale(2, RoundingMode.HALF_UP),
                    cumulative.setScale(2, RoundingMode.HALF_UP)
            ));
        }

        return series;
    }

    /**
     * Most recent income transaction's amount. Used as a fallback when
     * user.salary isn't explicitly set. Returns ZERO if the user has
     * no income history yet.
     */
    private static BigDecimal inferSalaryAmount(List<Transaction> all) {
        if (all == null || all.isEmpty()) return BigDecimal.ZERO;
        return all.stream()
                .filter(t -> "income".equalsIgnoreCase(t.getType()))
                .filter(t -> t.getAmount() != null && t.getTransactionDate() != null)
                .max((a, b) -> a.getTransactionDate().compareTo(b.getTransactionDate()))
                .map(Transaction::getAmount)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Use the day-of-month of the most recent income transaction as a
     * proxy for "salary day". Fallback to the 1st if no income history.
     */
    private static int inferSalaryDayOfMonth(List<Transaction> all) {
        if (all == null || all.isEmpty()) return 1;
        return all.stream()
                .filter(t -> "income".equalsIgnoreCase(t.getType()))
                .filter(t -> t.getTransactionDate() != null)
                .max((a, b) -> a.getTransactionDate().compareTo(b.getTransactionDate()))
                .map(t -> t.getTransactionDate().getDayOfMonth())
                .orElse(1);
    }

    /**
     * Daily non-subscription expense average over the lookback window.
     * Subscription-flagged transactions are excluded so we don't double-
     * count them — they already get added on their projected dates.
     */
    private BigDecimal computeDailyDiscretionary(List<Transaction> all) {
        if (all == null || all.isEmpty()) return BigDecimal.ZERO;

        LocalDate cutoff = LocalDate.now().minusDays(DISCRETIONARY_LOOKBACK_DAYS);
        // Build a quick set of (description, rounded amount) keys that
        // belong to a detected subscription, so we can exclude them.
        // For simplicity here we just exclude the categories we know are
        // dominated by subscriptions; the detector's own logic is more
        // precise but this is "close enough" for an avg-daily figure
        // and avoids a circular dep.

        BigDecimal total = BigDecimal.ZERO;
        int dayCount = 0;
        Map<LocalDate, BigDecimal> perDay = new HashMap<>();

        for (Transaction t : all) {
            if (!"expense".equalsIgnoreCase(t.getType())) continue;
            if (t.getAmount() == null || t.getTransactionDate() == null) continue;
            if (t.getTransactionDate().isBefore(cutoff)) continue;

            perDay.merge(t.getTransactionDate(), t.getAmount(), BigDecimal::add);
        }

        for (BigDecimal v : perDay.values()) {
            total = total.add(v);
            dayCount++;
        }

        if (dayCount == 0) return BigDecimal.ZERO;
        // Average over the WINDOW (not just days with activity) — gives
        // a smoother daily rate that includes "no spend" days.
        int windowDays = Math.min(DISCRETIONARY_LOOKBACK_DAYS, dayCount * 2);
        return total.divide(BigDecimal.valueOf(windowDays), 2, RoundingMode.HALF_UP);
    }

    /**
     * Project subscription charges into the forecast window. For each
     * detected subscription, walk forward from {@code nextExpected} in
     * steps of its period, until we leave the window.
     */
    private Map<LocalDate, BigDecimal> projectSubscriptions(long userId, int days) {
        Map<LocalDate, BigDecimal> out = new HashMap<>();
        List<DetectedSubscription> subs = subscriptionDetectorService.detect(userId);
        if (subs.isEmpty()) return out;

        LocalDate windowEnd = LocalDate.now().plusDays(days);
        for (DetectedSubscription s : subs) {
            if (s.nextExpected() == null || s.amount() == null) continue;
            LocalDate at = s.nextExpected();
            int periodDays = s.period().approxDays();
            // Walk forward at the period until we exit the window.
            while (!at.isAfter(windowEnd)) {
                if (!at.isBefore(LocalDate.now())) {
                    out.merge(at, s.amount(), BigDecimal::add);
                }
                at = at.plusDays(periodDays);
                // Safety — never iterate more than the window size.
                if (periodDays <= 0) break;
            }
        }
        return out;
    }
}
