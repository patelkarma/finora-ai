package com.project.financeDashboard;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FinancialDashboardApplicationTests {

    @Test
    void contextLoads() {
        // smoke test: verifies the full Spring context wires up under the
        // "test" profile (H2 in-memory DB, fake credentials, ollama LLM provider).
    }
}
