package com.project.financeDashboard;

import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the full app context and asserts our Finora-specific Micrometer
 * counters register on startup. Without this test the metric wiring would
 * be a "trust me" — a recruiter cloning the repo could see the dependency
 * in pom but not be sure the counters actually surface to the registry.
 *
 * <p>Counters are registered eagerly in TransactionService's constructor
 * and in RateLimitInterceptor's family on app start, so they appear in the
 * registry even at zero counts. Asserting on a zero-count counter keeps
 * the test deterministic — no need to issue traffic first.
 */
@SpringBootTest
@ActiveProfiles("test")
class ActuatorPrometheusTest {

    @Autowired MeterRegistry meterRegistry;

    @Test
    void customCountersAreRegistered() {
        // Eagerly registered in the TransactionService constructor — they
        // exist at startup even before the first transaction lands.
        assertThat(meterRegistry.find("finora.transactions.created").counter())
                .as("finora.transactions.created counter must be registered at startup").isNotNull();
        assertThat(meterRegistry.find("finora.transactions.imported").counter())
                .as("finora.transactions.imported counter must be registered at startup").isNotNull();

        // RateLimitInterceptor registers one Counter per rule on app start
        // (RateLimitConfig instantiates each interceptor eagerly), so all the
        // rule families are visible from the first scrape.
        assertThat(meterRegistry.find("finora.ratelimit.rejected").counters())
                .as("ratelimit family must register a counter per rule")
                .hasSizeGreaterThanOrEqualTo(5);
    }
}
