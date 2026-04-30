package com.project.financeDashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A recurring expense detected by {@code SubscriptionDetectorService}.
 * Read-only — never persisted; recomputed on demand from the user's
 * transaction history (and cached for 5 min).
 *
 * @param name        Display name — derived from the transaction
 *                    description (e.g. "Netflix", "Spotify Premium")
 * @param amount      Typical recurring charge
 * @param category    Source category from the underlying transactions
 * @param period      Inferred period: WEEKLY / BIWEEKLY / MONTHLY / YEARLY
 * @param occurrences How many matching transactions we found
 * @param firstSeen   Oldest matching transaction date
 * @param lastSeen    Most recent matching transaction date
 * @param nextExpected Projected next billing date based on the period
 *                    starting from {@code lastSeen}. Null if we can't
 *                    confidently project.
 * @param confidence  0.0 – 1.0. Higher when more occurrences with a
 *                    tighter period variance.
 */
public record DetectedSubscription(
        String name,
        BigDecimal amount,
        String category,
        Period period,
        int occurrences,
        LocalDate firstSeen,
        LocalDate lastSeen,
        LocalDate nextExpected,
        double confidence
) {
    public enum Period {
        WEEKLY, BIWEEKLY, MONTHLY, YEARLY;

        public int approxDays() {
            return switch (this) {
                case WEEKLY -> 7;
                case BIWEEKLY -> 14;
                case MONTHLY -> 30;
                case YEARLY -> 365;
            };
        }
    }
}
