package com.project.aiService.messaging;

public record InsightResponse(
        String correlationId,
        long userId,
        String text,
        String provider,
        String error
) {}
