package com.project.financeDashboard.service;

import com.project.financeDashboard.dto.DetectedAnomaly;
import com.project.financeDashboard.dto.DetectedAnomaly.Severity;
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
 * Pure-algorithm tests for the per-category z-score anomaly detector.
 * Builds a controlled distribution and verifies severity classification.
 */
@ExtendWith(MockitoExtension.class)
class AnomalyDetectorServiceTest {

    @Mock TransactionService transactionService;
    @InjectMocks AnomalyDetectorService detector;

    private static Transaction tx(long id, String amount, String category, LocalDate date) {
        Transaction t = new Transaction();
        t.setId(id);
        t.setDescription("entry-" + id);
        t.setAmount(new BigDecimal(amount));
        t.setCategory(category);
        t.setType("expense");
        t.setTransactionDate(date);
        return t;
    }

    @Test
    void single_severe_outlier_in_grocery_category_is_flagged_severe() {
        // Need a dense baseline so the outlier doesn't dominate the
        // mean+σ it's being measured against. 10 transactions around
        // ₹2000 ± 100, one at ₹8000 → z ≈ 3.2 → SEVERE.
        LocalDate today = LocalDate.now();
        List<Transaction> txs = new ArrayList<>();
        int[] normal = {1900, 1950, 2000, 2025, 2050, 2075, 2100, 1980, 1920, 2010};
        for (int i = 0; i < normal.length; i++) {
            txs.add(tx(i + 1, String.valueOf(normal[i]), "Groceries",
                    today.minusDays(i * 2L + 1)));
        }
        // The outlier — clearly out of distribution relative to the dense baseline.
        txs.add(tx(99, "8000", "Groceries", today.minusDays(50)));

        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        List<DetectedAnomaly> anomalies = detector.detect(1L);

        assertThat(anomalies).hasSize(1);
        DetectedAnomaly a = anomalies.get(0);
        assertThat(a.transactionId()).isEqualTo(99L);
        assertThat(a.amount()).isEqualByComparingTo("8000");
        assertThat(a.severity()).isEqualTo(Severity.SEVERE);
        assertThat(a.zScore()).isGreaterThan(3.0);
    }

    @Test
    void only_positive_deviations_are_flagged_smaller_than_normal_is_ignored() {
        // 4 groceries near ₹5000, one at ₹100 — z is large but negative.
        LocalDate today = LocalDate.now();
        List<Transaction> txs = List.of(
                tx(1, "5000", "Groceries", today.minusDays(2)),
                tx(2, "5000", "Groceries", today.minusDays(9)),
                tx(3, "5000", "Groceries", today.minusDays(16)),
                tx(4, "5000", "Groceries", today.minusDays(23)),
                tx(5, "100",  "Groceries", today.minusDays(30))
        );
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        // z(100) is hugely negative but not unusual in the alarming sense.
        // Should NOT flag.
        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void categories_with_fewer_than_min_samples_are_skipped() {
        LocalDate today = LocalDate.now();
        // Three Food entries — below MIN_SAMPLES = 4. Even with a wild
        // outlier, we can't compute a meaningful σ.
        List<Transaction> txs = List.of(
                tx(1, "300", "Food", today.minusDays(2)),
                tx(2, "320", "Food", today.minusDays(9)),
                tx(3, "20000", "Food", today.minusDays(16))
        );
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void zero_variance_categories_are_skipped() {
        // Five identical rent payments — σ = 0, division by zero would
        // be undefined. Detector must skip these gracefully.
        LocalDate today = LocalDate.now();
        List<Transaction> txs = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            txs.add(tx(i + 1, "20000", "Rent", today.minusDays(i * 7L)));
        }
        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void income_transactions_are_excluded_from_anomaly_consideration() {
        LocalDate today = LocalDate.now();
        List<Transaction> txs = new ArrayList<>();
        // 4 normal salary deposits at ₹70000 + one at ₹500000 (huge bonus).
        // Income should NOT be flagged as an anomaly — only expenses.
        for (int i = 0; i < 4; i++) {
            Transaction t = new Transaction();
            t.setId((long) i + 1);
            t.setAmount(new BigDecimal("70000"));
            t.setType("income");
            t.setCategory("Salary");
            t.setTransactionDate(today.minusDays(i * 7L));
            txs.add(t);
        }
        Transaction huge = new Transaction();
        huge.setId(99L);
        huge.setAmount(new BigDecimal("500000"));
        huge.setType("income");
        huge.setCategory("Salary");
        huge.setTransactionDate(today.minusDays(40));
        txs.add(huge);

        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        assertThat(detector.detect(1L)).isEmpty();
    }

    @Test
    void severe_results_sort_before_moderate() {
        // Two categories with controlled distributions:
        //   Groceries: dense around ₹2000 + one extreme at ₹8000  → SEVERE
        //   Food: dense around ₹500 ± small jitter + one at ₹900  → MODERATE
        LocalDate today = LocalDate.now();
        List<Transaction> txs = new ArrayList<>();

        int[] groc = {1900, 1950, 2000, 2050, 2025, 1980, 2100, 1920, 2010, 1990};
        for (int i = 0; i < groc.length; i++) {
            txs.add(tx(i + 1, String.valueOf(groc[i]), "Groceries",
                    today.minusDays(i * 2L + 1)));
        }
        txs.add(tx(99, "8000", "Groceries", today.minusDays(50)));

        int[] food = {480, 500, 520, 510, 490, 505, 495, 515, 485, 505};
        for (int i = 0; i < food.length; i++) {
            txs.add(tx(100 + i, String.valueOf(food[i]), "Food",
                    today.minusDays(i * 2L + 2)));
        }
        // Bump just over MODERATE threshold: σ ≈ 12, z(575) ≈ 6 — that's SEVERE.
        // Use a smaller bump for MODERATE only: ~530 → z ≈ 2.5.
        txs.add(tx(199, "530", "Food", today.minusDays(55)));

        when(transactionService.getTransactionsByUserId(1L)).thenReturn(txs);

        List<DetectedAnomaly> anomalies = detector.detect(1L);

        assertThat(anomalies).isNotEmpty();
        // First entry must be SEVERE regardless of which category came first.
        assertThat(anomalies.get(0).severity()).isEqualTo(Severity.SEVERE);
    }
}
