package com.project.financeDashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One day in the cash-flow projection. The series is consumed by
 * a line chart on the frontend, so each point carries everything
 * needed for both the line itself and a tooltip:
 *
 * @param date          The projected day
 * @param income        Income expected to land on this day (salary etc.)
 * @param subscription  Recurring subscription charges projected for today
 * @param discretionary Non-recurring spending estimate (daily average)
 * @param netDelta      income - (subscription + discretionary)
 * @param cumulative    Running sum of netDelta from day 0
 */
public record ForecastPoint(
        LocalDate date,
        BigDecimal income,
        BigDecimal subscription,
        BigDecimal discretionary,
        BigDecimal netDelta,
        BigDecimal cumulative
) {}
