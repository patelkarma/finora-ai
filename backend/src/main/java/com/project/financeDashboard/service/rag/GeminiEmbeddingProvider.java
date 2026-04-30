package com.project.financeDashboard.service.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.financeDashboard.service.llm.LlmUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
 * Google Gemini text-embedding-004 provider. 768-dim cosine-friendly
 * vectors. Free tier: 1500 RPD on the same /v1beta endpoint family as
 * the chat model.
 *
 * Endpoint:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent?key={API_KEY}
 *
 * Request body:
 *   { "content": { "parts": [{"text": "<text>"}] } }
 *
 * Response shape:
 *   { "embedding": { "values": [768 floats] } }
 *
 * Active when {@code rag.embedding.provider=gemini} (default).
 */
@Component
@ConditionalOnProperty(name = "rag.embedding.provider", havingValue = "gemini", matchIfMissing = true)
public class GeminiEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingProvider.class);
    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final int DIMS = 768;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${rag.embedding.model:text-embedding-004}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiEmbeddingProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public float[] embed(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmUnavailableException("GEMINI_API_KEY is not configured");
        }
        if (text == null || text.isBlank()) {
            throw new LlmUnavailableException("Cannot embed empty text");
        }

        String url = BASE_URL + model + ":embedContent?key=" + apiKey;
        // gemini-embedding-001 returns 3072 dims by default; we declared
        // vector(768) in the V4 migration, so we must request 768
        // explicitly via outputDimensionality. taskType=RETRIEVAL_DOCUMENT
        // hints to the model that this text will be retrieved against,
        // improving downstream cosine-similarity quality.
        Map<String, Object> body = Map.of(
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "taskType", "RETRIEVAL_DOCUMENT",
                "outputDimensionality", DIMS
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            HttpEntity<String> request = new HttpEntity<>(mapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new LlmUnavailableException("Gemini embed HTTP " + response.getStatusCode());
            }

            JsonNode root = mapper.readTree(response.getBody());
            JsonNode values = root.path("embedding").path("values");
            if (!values.isArray() || values.size() != DIMS) {
                throw new LlmUnavailableException(
                        "Gemini embed returned unexpected shape (expected " + DIMS
                                + " floats, got " + values.size() + ")");
            }

            float[] out = new float[DIMS];
            for (int i = 0; i < DIMS; i++) {
                out[i] = (float) values.get(i).asDouble();
            }
            return out;
        } catch (RestClientException e) {
            log.warn("Gemini embed failed: {}", e.getMessage());
            throw new LlmUnavailableException("Gemini embed failed: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new LlmUnavailableException("Gemini embed parse error: " + e.getMessage(), e);
        }
    }

    @Override
    public int dimensions() {
        return DIMS;
    }

    @Override
    public String name() {
        return "gemini";
    }
}
