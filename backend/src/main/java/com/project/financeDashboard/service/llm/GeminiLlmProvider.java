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

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

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

    /**
     * Stream variant. Calls Gemini's {@code :streamGenerateContent} with
     * {@code alt=sse} so the response is plain SSE — one {@code data:}
     * line per partial-candidate frame. We extract the text fragment
     * from each frame and forward it via {@code onChunk}.
     *
     * <p>Uses {@link HttpClient} (JDK 11+) instead of RestTemplate
     * because RestTemplate buffers the full body before returning,
     * defeating streaming.
     */
    @Override
    public void generateStream(String prompt, Consumer<String> onChunk) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmUnavailableException("GEMINI_API_KEY is not configured");
        }

        String url = BASE_URL + model + ":streamGenerateContent?alt=sse&key=" + apiKey;
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request;
        try {
            request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
        } catch (Exception e) {
            throw new LlmUnavailableException("Failed to build Gemini stream request: " + e.getMessage(), e);
        }

        HttpResponse<InputStream> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (Exception e) {
            log.warn("Gemini stream open failed: {}", e.getMessage());
            throw new LlmUnavailableException("Gemini stream open failed: " + e.getMessage(), e);
        }

        if (response.statusCode() != 200) {
            throw new LlmUnavailableException("Gemini stream HTTP " + response.statusCode());
        }

        boolean emittedAny = false;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                // SSE format: lines starting with "data: " carry the payload,
                // blank lines separate events. Anything else is metadata to skip.
                if (!line.startsWith("data: ")) continue;
                String json = line.substring(6).trim();
                if (json.isEmpty() || json.equals("[DONE]")) continue;

                try {
                    JsonNode root = mapper.readTree(json);
                    JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
                    if (parts.isArray()) {
                        StringBuilder chunk = new StringBuilder();
                        parts.forEach(p -> {
                            if (p.has("text")) chunk.append(p.get("text").asText());
                        });
                        if (chunk.length() > 0) {
                            onChunk.accept(chunk.toString());
                            emittedAny = true;
                        }
                    }
                } catch (Exception parseEx) {
                    // Ignore individual malformed frames — the rest of the stream
                    // is usually still valid. Don't take down the whole reply.
                    log.debug("Skipping malformed Gemini SSE frame: {}", parseEx.getMessage());
                }
            }
        } catch (Exception e) {
            throw new LlmUnavailableException("Gemini stream read failed: " + e.getMessage(), e);
        }

        if (!emittedAny) {
            throw new LlmUnavailableException("Gemini stream produced no text");
        }
    }

    @Override
    public String name() {
        return "gemini";
    }
}
