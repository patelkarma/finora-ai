package com.project.aiService.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Minimal Gemini client for the ai-service. Pure compute — no DB, no
 * caching (the backend's LlmService still owns the cache for the same
 * prompt → response flow). Resilience4j circuit breaker + retry around
 * the upstream so a sick Gemini fails fast.
 *
 * <p>This is a simplified copy of backend's {@code GeminiLlmProvider},
 * deliberately not shared via a library — keeping the two independent
 * means ai-service could one day be re-implemented in another language
 * without coordinating versions.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Call Gemini's :generateContent endpoint and return the raw text.
     * Throws {@link LlmUnavailableException} on any failure so
     * Resilience4j's breaker can record and trip on threshold.
     */
    @CircuitBreaker(name = "llm")
    @Retry(name = "llm")
    public String generate(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmUnavailableException("GEMINI_API_KEY is not configured");
        }

        String url = BASE_URL + model + ":generateContent?key=" + apiKey;
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            HttpEntity<String> request = new HttpEntity<>(mapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new LlmUnavailableException("Gemini HTTP " + response.getStatusCode());
            }

            JsonNode root = mapper.readTree(response.getBody());
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new LlmUnavailableException("Gemini returned no candidates");
            }

            StringBuilder out = new StringBuilder();
            parts.forEach(p -> {
                if (p.has("text")) out.append(p.get("text").asText());
            });
            String text = out.toString().trim();
            if (text.isEmpty()) {
                throw new LlmUnavailableException("Gemini produced empty text");
            }
            return text;
        } catch (RestClientException e) {
            log.warn("Gemini call failed: {}", e.getMessage());
            throw new LlmUnavailableException("Gemini call failed: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new LlmUnavailableException("Gemini parse error: " + e.getMessage(), e);
        }
    }

    public String name() {
        return "gemini";
    }
}
