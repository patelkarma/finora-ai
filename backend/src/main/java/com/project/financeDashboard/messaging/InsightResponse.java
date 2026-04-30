package com.project.financeDashboard.messaging;

/**
 * Wire-format reply: ai-service → backend "here's the generated insight
 * for the request you sent with this correlationId".
 *
 * <p>{@code error} is non-null when ai-service couldn't produce text
 * (Gemini outage, quota exhaustion, parse failure). Backend can choose
 * to surface a friendly message OR persist the error for retry-from-UI.
 */
public record InsightResponse(
        String correlationId,
        long userId,
        String text,
        String provider,
        String error
) {}
