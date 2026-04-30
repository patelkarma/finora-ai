package com.project.financeDashboard.messaging;

/**
 * Wire-format message: backend → ai-service "please generate an insight
 * for this prompt". Backend has already built the prompt from the user's
 * transactions and budgets (so the ai-service stays stateless — no DB
 * access needed).
 *
 * <p>Mirrored byte-identically in ai-service under the same package
 * name. Records carry only data and have stable JSON serialization, so
 * the duplication cost is minimal. We keep the two files independent
 * rather than introducing a shared module to avoid pulling Spring Boot
 * lifecycle into a third Maven artifact.
 *
 * @param correlationId a server-generated UUID. Backend's reply listener
 *                      uses this to match the InsightResponse back to the
 *                      original HTTP request awaiting the result.
 * @param userId        for logging / traceability only — ai-service is
 *                      stateless and doesn't read user data
 * @param prompt        the full prompt to feed Gemini
 */
public record InsightRequest(
        String correlationId,
        long userId,
        String prompt
) {}
