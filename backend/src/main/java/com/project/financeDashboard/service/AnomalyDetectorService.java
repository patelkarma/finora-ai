package com.project.financeDashboard.service;

import com.project.financeDashboard.config.RedisCacheConfig;
import com.project.financeDashboard.dto.DetectedAnomaly;
import com.project.financeDashboard.dto.DetectedAnomaly.Severity;
import com.project.financeDashboard.model.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Flags transactions that deviate significantly from the user's
 * typical spending in their category. Per-category z-score over a
 * rolling 90-day window: anything beyond 2σ from the mean is an
 * anomaly, beyond 3σ is "severe".
 *
 * <p>Why per-category rather than global: a ₹5000 grocery run is
 * unremarkable; a ₹5000 coffee is not. Comparing each transaction
 * only against its category's baseline keeps the signal honest.
 *
 * <p>Compute-on-read with a 5min cache. Anomalies don't change
 * frequently and recomputing from scratch is cheap (linear over the
 * user's transaction list).
 */
@Service
public class AnomalyDetectorService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectorService.class);

    /** Lookback window for the baseline. */
    private static final int WINDOW_DAYS = 90;

    /** Need at least this many samples per category for a meaningful σ. */
    private static final int MIN_SAMPLES = 4;

    /** z-score thresholds. */
    private static final double Z_MODERATE = 2.0;
    private static final double Z_SEVERE = 3.0;

    private final TransactionService transactionService;

    public AnomalyDetectorService(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @Cacheable(value = RedisCacheConfig.CACHE_INSIGHTS, key = "'anomalies:' + #userId")
    public List<DetectedAnomaly> detect(long userId) {
        List<Transaction> all = transactionService.getTransactionsByUserId(userId);
        if (all == null || all.isEmpty()) return List.of();

        LocalDate cutoff = LocalDate.now().minusDays(WINDOW_DAYS);

        // Group expenses by category, within the window.
        Map<String, List<Transaction>> byCategory = new HashMap<>();
        for (Transaction t : all) {
            if (!"expense".equalsIgnoreCase(t.getType())) continue;
            if (t.getAmount() == null || t.getTransactionDate() == null) continue;
            if (t.getTransactionDate().isBefore(cutoff)) continue;

            String cat = t.getCategory() != null && !t.getCategory().isBlank()
                    ? t.getCategory() : "Uncategorized";
            byCategory.computeIfAbsent(cat, k -> new ArrayList<>()).add(t);
        }

        List<DetectedAnomaly> result = new ArrayList<>();

        for (Map.Entry<String, List<Transaction>> e : byCategory.entrySet()) {
            List<Transaction> txs = e.getValue();
            if (txs.size() < MIN_SAMPLES) continue;

            double[] amounts = txs.stream()
                    .mapToDouble(t -> t.getAmount().doubleValue())
                    .toArray();

            double mean = mean(amounts);
            double stddev = stddev(amounts, mean);
            // No spread → every same-amount entry has z=0, can't flag anything.
            if (stddev == 0) continue;

            for (Transaction t : txs) {
                double amt = t.getAmount().doubleValue();
                double z = (amt - mean) / stddev;
                // Only positive deviations matter — a smaller-than-usual
                // expense isn't an anomaly worth flagging in this UX.
                if (z < Z_MODERATE) continue;

                Severity sev = z >= Z_SEVERE ? Severity.SEVERE : Severity.MODERATE;
                result.add(new DetectedAnomaly(
                        t.getId(),
                        t.getDescription() != null ? t.getDescription() : t.getCategory(),
                        t.getAmount(),
                        e.getKey(),
                        t.getTransactionDate(),
                        Math.round(z * 100.0) / 100.0,
                        BigDecimal.valueOf(mean).setScale(2, RoundingMode.HALF_UP),
                        sev
                ));
            }
        }

        // Severe first, then by recency, then by z-score. The user wants
        // the loudest, freshest signals at the top.
        result.sort(Comparator
                .comparing(DetectedAnomaly::severity).reversed()
                .thenComparing(DetectedAnomaly::transactionDate, Comparator.reverseOrder())
                .thenComparing(Comparator.comparingDouble(DetectedAnomaly::zScore).reversed()));

        log.debug("Anomaly detection user={} window={}d categories={} flagged={}",
                userId, WINDOW_DAYS, byCategory.size(), result.size());
        return result;
    }

    private static double mean(double[] xs) {
        double s = 0;
        for (double x : xs) s += x;
        return s / xs.length;
    }

    private static double stddev(double[] xs, double mean) {
        double s = 0;
        for (double x : xs) {
            double d = x - mean;
            s += d * d;
        }
        // Sample stddev (n-1) — the user's transactions are a sample
        // of an unbounded "spending behavior" population.
        return Math.sqrt(s / (xs.length - 1));
    }
}
