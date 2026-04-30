package com.project.aiService.messaging;

/**
 * @see com.project.financeDashboard.messaging.InsightRequest in backend.
 *
 * <p>Mirrored definition rather than a shared library — keeping each
 * side's wire DTO independent means ai-service can be deployed in any
 * language eventually (Python, Node) without coordinating Maven
 * artifacts.
 */
public record InsightRequest(
        String correlationId,
        long userId,
        String prompt
) {}
