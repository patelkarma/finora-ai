package com.project.financeDashboard.service;

import com.project.financeDashboard.dto.DetectedSubscription;
import com.project.financeDashboard.dto.DetectedSubscription.Period;
import com.project.financeDashboard.model.Transaction;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Pure-algorithm tests for the subscription detector. Mocks the
 * transaction service so we can hand the detector exactly the rows we
 * want to grade it against.
 */
@ExtendWith(MockitoExtension.class)
class SubscriptionDetectorServiceTest {

    @Mock TransactionService transactionService;
    @InjectMocks SubscriptionDetectorService detector;

    private static Transaction expense(String desc, String amount, String category, LocalDate date) {
        Transaction t = new Transaction();
        t.setDescription(desc);
        t.setAmount(new BigDecimal(amount));
        t.setCategory(category);
        t.setType("expense");
        t.setTransactionDate(date);
        return t;
    }

    @Test
    void detects_monthly_subscription_with_three_consistent_charges() {
        // Three Netflix charges on the 5th of three consecutive months.
        // 30-day gap dominance > 70% → MONTHLY.
        LocalDate today = LocalDate.now();
        List<Transaction> txs = List.of(
                expense("Netflix", "499", "Subscriptions", today.minusMonths(2).withDayOfMonth(5)),
                expense("Netflix", "499", "Subscriptions", today.minusMonths(1).withDayOfMonth(5)),
                expense("Netflix", "499", "Subscriptions", today.withDayOfMonth(5))
        );
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        List<DetectedSubscription> detected = detector.detect(1L);

        assertThat(detected).hasSize(1);
        DetectedSubscription sub = detected.get(0);
        assertThat(sub.name()).isEqualTo("Netflix");
        assertThat(sub.period()).isEqualTo(Period.MONTHLY);
        assertThat(sub.occurrences()).isEqualTo(3);
        assertThat(sub.amount()).isEqualByComparingTo("499");
        assertThat(sub.confidence()).isGreaterThan(0.6);
    }

    @Test
    void detects_weekly_subscription_with_four_charges_seven_days_apart() {
        LocalDate today = LocalDate.now();
        List<Transaction> txs = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            txs.add(expense("Gym day pass", "200", "Health", today.minusDays(i * 7L)));
        }
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        List<DetectedSubscription> detected = detector.detect(1L);

        assertThat(detected).hasSize(1);
        assertThat(detected.get(0).period()).isEqualTo(Period.WEEKLY);
        assertThat(detected.get(0).occurrences()).isEqualTo(4);
    }

    @Test
    void single_occurrence_is_not_a_subscription() {
        LocalDate today = LocalDate.now();
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of(
                expense("One-time donation", "1000", "Charity", today.minusDays(15))
        ));

        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void inconsistent_gaps_below_dominance_threshold_are_not_subscriptions() {
        // Five same-amount charges with wildly different gaps — no period
        // bucket can hit the 70% dominance threshold.
        LocalDate today = LocalDate.now();
        List<Transaction> txs = List.of(
                expense("Coffee", "200", "Coffee", today.minusDays(60)),
                expense("Coffee", "200", "Coffee", today.minusDays(50)),
                expense("Coffee", "200", "Coffee", today.minusDays(20)),
                expense("Coffee", "200", "Coffee", today.minusDays(15)),
                expense("Coffee", "200", "Coffee", today.minusDays(2))
        );
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        // Gaps: 10, 30, 5, 13 — spans WEEKLY, MONTHLY, BIWEEKLY buckets,
        // none dominant. Should NOT detect.
        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void income_transactions_are_ignored() {
        LocalDate today = LocalDate.now();
        Transaction salary1 = new Transaction();
        salary1.setDescription("Monthly salary");
        salary1.setAmount(new BigDecimal("70000"));
        salary1.setType("income");
        salary1.setCategory("Salary");
        salary1.setTransactionDate(today.minusMonths(2));

        Transaction salary2 = new Transaction();
        salary2.setDescription("Monthly salary");
        salary2.setAmount(new BigDecimal("70000"));
        salary2.setType("income");
        salary2.setCategory("Salary");
        salary2.setTransactionDate(today.minusMonths(1));

        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of(salary1, salary2));

        // The detector is for EXPENSE recurrences. Two regular salary
        // deposits would otherwise look like a monthly subscription.
        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void empty_history_returns_empty_list() {
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(List.of());
        assertThat(detector.detect(1L)).isEmpty();
    }
}
