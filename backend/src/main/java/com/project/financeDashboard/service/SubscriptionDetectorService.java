package com.project.financeDashboard.service;

import com.project.financeDashboard.config.RedisCacheConfig;
import com.project.financeDashboard.dto.DetectedSubscription;
import com.project.financeDashboard.dto.DetectedSubscription.Period;
import com.project.financeDashboard.model.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Detects recurring expense transactions ("subscriptions") from the
 * user's history. Pure read-only computation — never persisted.
 *
 * <p>Algorithm:
 * <ol>
 *   <li>Take all EXPENSE transactions for the user.</li>
 *   <li>Group by (normalized description, rounded amount). Tolerance
 *       on amount ±5% so {@code ₹499.00} and {@code ₹523.95} are
 *       treated as the same subscription with a price bump.</li>
 *   <li>Each group with &geq;2 transactions becomes a candidate.</li>
 *   <li>Compute consecutive-date gaps. If at least 70% of gaps land
 *       in a single period bucket (weekly / biweekly / monthly /
 *       yearly), declare the group a subscription with that period.</li>
 *   <li>{@code nextExpected = lastSeen + period}. Confidence rises
 *       with occurrence count and gap consistency.</li>
 * </ol>
 *
 * <p>Cached on user id for 5 minutes — same TTL as the underlying
 * transactions cache. Any transaction write evicts the
 * {@code transactions:user} cache, but this cache lives separately;
 * we accept up to 5min staleness in exchange for not having to wire
 * up a second eviction trigger.
 */
@Service
public class SubscriptionDetectorService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionDetectorService.class);

    /** ±5% on amount before two charges are considered the "same" subscription. */
    private static final double AMOUNT_TOLERANCE = 0.05;

    /** Group must have at least this many matching transactions to count. */
    private static final int MIN_OCCURRENCES = 2;

    /** Period buckets — ordered tightest-to-broadest matching window. */
    private static final List<PeriodBucket> BUCKETS = List.of(
            new PeriodBucket(Period.WEEKLY, 5, 9),
            new PeriodBucket(Period.BIWEEKLY, 12, 17),
            new PeriodBucket(Period.MONTHLY, 25, 35),
            new PeriodBucket(Period.YEARLY, 350, 380)
    );

    /** Fraction of gaps that must fall in the dominant bucket. */
    private static final double DOMINANCE_THRESHOLD = 0.70;

    private final TransactionService transactionService;

    public SubscriptionDetectorService(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @Cacheable(value = RedisCacheConfig.CACHE_INSIGHTS, key = "'subs:' + #userId")
    public List<DetectedSubscription> detect(long userId) {
        List<Transaction> all = transactionService.getTransactionsByUserId(userId);
        if (all == null || all.isEmpty()) return List.of();

        // Bucket key = normalized description + rounded amount. Round to
        // nearest 5% of the value so small variations stay together.
        Map<String, List<Transaction>> groups = new HashMap<>();
        for (Transaction t : all) {
            if (!"expense".equalsIgnoreCase(t.getType())) continue;
            if (t.getDescription() == null || t.getDescription().isBlank()) continue;
            if (t.getAmount() == null || t.getTransactionDate() == null) continue;

            String key = normalize(t.getDescription()) + "|" + bucketAmount(t.getAmount());
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(t);
        }

        List<DetectedSubscription> result = new ArrayList<>();
        for (Map.Entry<String, List<Transaction>> e : groups.entrySet()) {
            List<Transaction> group = e.getValue();
            if (group.size() < MIN_OCCURRENCES) continue;

            DetectedSubscription detected = classify(group);
            if (detected != null) result.add(detected);
        }

        // Most recent + highest confidence first — useful default for the UI.
        result.sort(Comparator
                .comparing(DetectedSubscription::lastSeen).reversed()
                .thenComparing(Comparator.comparingDouble(DetectedSubscription::confidence).reversed()));

        log.debug("Subscription detection user={} candidates={} confirmed={}",
                userId, groups.size(), result.size());
        return result;
    }

    private DetectedSubscription classify(List<Transaction> group) {
        // Sort ascending so consecutive-date math is straightforward.
        group.sort(Comparator.comparing(Transaction::getTransactionDate));

        // Compute gaps in days between consecutive transactions.
        List<Long> gaps = new ArrayList<>(group.size() - 1);
        for (int i = 1; i < group.size(); i++) {
            long days = ChronoUnit.DAYS.between(
                    group.get(i - 1).getTransactionDate(),
                    group.get(i).getTransactionDate());
            if (days > 0) gaps.add(days);
        }
        if (gaps.isEmpty()) return null;

        // Count how many gaps land in each bucket; pick the dominant one.
        PeriodBucket best = null;
        int bestCount = 0;
        for (PeriodBucket b : BUCKETS) {
            int n = 0;
            for (long g : gaps) if (g >= b.minDays && g <= b.maxDays) n++;
            if (n > bestCount) {
                bestCount = n;
                best = b;
            }
        }
        if (best == null) return null;

        double dominance = (double) bestCount / gaps.size();
        if (dominance < DOMINANCE_THRESHOLD) return null;

        Transaction first = group.get(0);
        Transaction last = group.get(group.size() - 1);

        // Use the first transaction's description for display — preserves
        // user-entered casing rather than the normalized lookup key.
        String name = first.getDescription();
        String category = first.getCategory();
        BigDecimal amount = medianAmount(group);
        LocalDate nextExpected = last.getTransactionDate().plusDays(best.period.approxDays());

        // Confidence: dominance × occurrence-bonus, capped at 1.0.
        // 2 occurrences ≈ 0.6 base; 5+ occurrences saturates near 1.0.
        double occurrenceBonus = Math.min(1.0, group.size() / 5.0);
        double confidence = Math.min(1.0, dominance * (0.5 + 0.5 * occurrenceBonus));

        return new DetectedSubscription(
                name,
                amount,
                category,
                best.period,
                group.size(),
                first.getTransactionDate(),
                last.getTransactionDate(),
                nextExpected,
                Math.round(confidence * 100.0) / 100.0
        );
    }

    /** Lowercased, whitespace-collapsed description. Used as a grouping key only. */
    private static String normalize(String s) {
        return s.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    /**
     * Round amount to a 5% bucket so ₹499 and ₹523 land together.
     * Returns the bucket's lower boundary as a string key.
     */
    private static String bucketAmount(BigDecimal amount) {
        if (amount == null) return "0";
        double v = amount.doubleValue();
        double bucket = v == 0 ? 0 : Math.floor(v / Math.max(v * AMOUNT_TOLERANCE, 1.0));
        return Double.toString(bucket);
    }

    /** Median of the group's amounts — robust to one-off price bumps. */
    private static BigDecimal medianAmount(List<Transaction> group) {
        List<BigDecimal> sorted = group.stream()
                .map(Transaction::getAmount)
                .sorted()
                .toList();
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) return sorted.get(mid);
        return sorted.get(mid - 1).add(sorted.get(mid))
                .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
    }

    private record PeriodBucket(Period period, int minDays, int maxDays) {}
}
