package com.project.aiService.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * RestTemplate for outbound Gemini calls. Connect timeout short (we'd
 * rather fail fast and let the circuit breaker open) and read timeout
 * generous enough for a long generation.
 */
@Configuration
public class HttpConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(60))
                .build();
    }
}
