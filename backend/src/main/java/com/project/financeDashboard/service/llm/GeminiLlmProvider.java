package com.project.financeDashboard.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Google Gemini provider. Free-tier: 1500 requests/day on
 * {@code gemini-2.0-flash}. Active when {@code llm.provider=gemini} (default).
 *
 * Endpoint:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
 *
 * Request body:
 *   { "contents":[{"parts":[{"text": "<prompt>"}]}] }
 *
 * Response shape:
 *   { "candidates":[{"content":{"parts":[{"text":"..."}]}}] }
 */
@Component
@ConditionalOnProperty(name = "llm.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiLlmProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiLlmProvider.class);
    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiLlmProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public String generate(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmUnavailableException("GEMINI_API_KEY is not configured");
        }

        String url = BASE_URL + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
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

    @Override
    public String name() {
        return "gemini";
    }
}
