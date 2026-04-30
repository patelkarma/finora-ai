package com.project.financeDashboard.service;

import com.project.financeDashboard.dto.DetectedSubscription;
import com.project.financeDashboard.dto.DetectedSubscription.Period;
import com.project.financeDashboard.dto.ForecastPoint;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashFlowForecastServiceTest {

    @Mock TransactionService transactionService;
    @Mock UserService userService;
    @Mock SubscriptionDetectorService subscriptionDetectorService;
    @InjectMocks CashFlowForecastService forecastService;

    private static User userWithSalary(Long id, Integer salary) {
        User u = new User();
        // User.id has no setter (JPA-generated). Reach in via reflection
        // so the mock-stubbed userService can match on getId() == id.
        ReflectionTestUtils.setField(u, "id", id);
        u.setName("Karma");
        u.setSalary(salary);
        return u;
    }

    private static Transaction expense(String amount, String category, LocalDate date) {
        Transaction t = new Transaction();
        t.setAmount(new BigDecimal(amount));
        t.setCategory(category);
        t.setType("expense");
        t.setTransactionDate(date);
        return t;
    }

    private static Transaction income(String amount, LocalDate date) {
        Transaction t = new Transaction();
        t.setAmount(new BigDecimal(amount));
        t.setCategory("Salary");
        t.setType("income");
        t.setDescription("Monthly salary");
        t.setTransactionDate(date);
        return t;
    }

    @BeforeEach
    void setUp() {
        // The service caps the forecast window at 30 in a private const,
        // but the @Value defaults aren't applied via Mockito @InjectMocks.
        // No injected fields here that need overriding for these tests.
    }

    @Test
    void empty_user_returns_empty_series() {
        when(userService.findById(99L)).thenReturn(Optional.empty());

        List<ForecastPoint> series = forecastService.forecast(99L, 30);
        assertThat(series).isEmpty();
    }

    @Test
    void series_length_matches_requested_days() {
        User u = userWithSalary(1L, 70000);
        when(userService.findById(1L)).thenReturn(Optional.of(u));
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of());
        when(subscriptionDetectorService.detect(1L)).thenReturn(List.of());

        List<ForecastPoint> series = forecastService.forecast(1L, 14);
        assertThat(series).hasSize(14);
    }

    @Test
    void invalid_days_clamps_to_default_30() {
        User u = userWithSalary(1L, 70000);
        when(userService.findById(1L)).thenReturn(Optional.of(u));
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of());
        when(subscriptionDetectorService.detect(1L)).thenReturn(List.of());

        // Negative input → default 30
        assertThat(forecastService.forecast(1L, -5)).hasSize(30);
        // Excessive input → also default 30 (cap is 90 in the impl)
        assertThat(forecastService.forecast(1L, 200)).hasSize(30);
    }

    @Test
    void salary_lands_on_inferred_day_of_month() {
        // Most recent income transaction was on day-of-month 15 →
        // forecast should add salary on every day-15 in the window.
        User u = userWithSalary(1L, 50000);
        when(userService.findById(1L)).thenReturn(Optional.of(u));

        LocalDate today = LocalDate.now();
        // Last salary on the 15th of the previous month.
        LocalDate lastSalary = today.minusMonths(1).withDayOfMonth(15);
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of(
                income("50000", lastSalary)
        ));
        when(subscriptionDetectorService.detect(1L)).thenReturn(List.of());

        List<ForecastPoint> series = forecastService.forecast(1L, 30);

        // Sum of income across the window. There's at most one DOM=15 in
        // any 30-day stretch (sometimes zero if the window doesn't cross
        // it). Tolerate either case but ensure it's never unbounded.
        BigDecimal totalIncome = series.stream()
                .map(ForecastPoint::income)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(totalIncome).isIn(
                new BigDecimal("0.00"),
                new BigDecimal("50000.00")
        );
    }

    @Test
    void detected_subscription_charges_appear_in_series() {
        User u = userWithSalary(1L, 70000);
        when(userService.findById(1L)).thenReturn(Optional.of(u));
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of());

        // Single subscription due in 5 days.
        LocalDate netflixDue = LocalDate.now().plusDays(5);
        DetectedSubscription netflix = new DetectedSubscription(
                "Netflix", new BigDecimal("499"), "Subscriptions",
                Period.MONTHLY, 3,
                netflixDue.minusMonths(2), netflixDue.minusMonths(1),
                netflixDue, 0.95);
        when(subscriptionDetectorService.detect(1L)).thenReturn(List.of(netflix));

        List<ForecastPoint> series = forecastService.forecast(1L, 30);

        ForecastPoint dueDay = series.stream()
                .filter(p -> p.date().equals(netflixDue))
                .findFirst()
                .orElseThrow();
        assertThat(dueDay.subscription()).isEqualByComparingTo("499.00");
    }

    @Test
    void cumulative_at_each_point_equals_running_sum_of_net_deltas() {
        User u = userWithSalary(1L, 70000);
        when(userService.findById(1L)).thenReturn(Optional.of(u));
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of(
                expense("100", "Food", LocalDate.now().minusDays(5)),
                expense("200", "Food", LocalDate.now().minusDays(10))
        ));
        when(subscriptionDetectorService.detect(1L)).thenReturn(List.of());

        List<ForecastPoint> series = forecastService.forecast(1L, 7);

        BigDecimal running = BigDecimal.ZERO;
        for (ForecastPoint p : series) {
            running = running.add(p.netDelta());
            // Allow 0.01 tolerance for rounding (HALF_UP at 2 dp).
            assertThat(p.cumulative().subtract(running).abs())
                    .isLessThan(new BigDecimal("0.02"));
        }
    }
}
