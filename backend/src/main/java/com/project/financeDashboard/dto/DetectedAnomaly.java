package com.project.financeDashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A transaction whose amount sits well outside the user's normal
 * spending pattern for its category. Computed on read by
 * {@code AnomalyDetectorService}; never persisted.
 *
 * @param transactionId  Source row id (so the UI can deep-link to edit)
 * @param description    User-facing description
 * @param amount         Actual amount of the flagged transaction
 * @param category       Category bucket the anomaly was scored against
 * @param transactionDate When it occurred
 * @param zScore         Standard deviations above the category's mean.
 *                        z=2 → "moderate", z=3+ → "severe".
 * @param categoryMean   The mean amount in this category over the
 *                        observation window — useful as a "normal range"
 *                        for the UI tooltip.
 * @param severity       Pre-classified bucket, mostly for UI styling.
 */
public record DetectedAnomaly(
        Long transactionId,
        String description,
        BigDecimal amount,
        String category,
        LocalDate transactionDate,
        double zScore,
        BigDecimal categoryMean,
        Severity severity
) {
    public enum Severity { MODERATE, SEVERE }
}
