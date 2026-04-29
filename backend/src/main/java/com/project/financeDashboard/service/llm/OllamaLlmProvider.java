package com.project.financeDashboard.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Local Ollama provider (zero-cost, runs against an Ollama server on localhost
 * or an internal address). Active when {@code llm.provider=ollama}.
 */
@Component
@ConditionalOnProperty(name = "llm.provider", havingValue = "ollama")
public class OllamaLlmProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaLlmProvider.class);

    @Value("${ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${ollama.model:mistral:7b}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public OllamaLlmProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public String generate(String prompt) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("prompt", prompt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> request = new HttpEntity<>(mapper.writeValueAsString(body), headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    ollamaUrl + "/api/generate", request, String.class);

            if (response.getStatusCode() != HttpStatus.OK) {
                throw new LlmUnavailableException("Ollama HTTP " + response.getStatusCode());
            }

            String responseBody = response.getBody();
            if (responseBody == null || responseBody.isBlank()) {
                throw new LlmUnavailableException("Ollama returned an empty response");
            }

            // Ollama streams multiple JSON objects per line; concatenate "response" fields
            StringBuilder result = new StringBuilder();
            for (String line : responseBody.split("\n")) {
                if (!line.trim().isEmpty()) {
                    JsonNode node = mapper.readTree(line);
                    if (node.has("response")) {
                        result.append(node.get("response").asText());
                    }
                }
            }
            String text = result.toString().trim();
            if (text.isEmpty()) {
                throw new LlmUnavailableException("Ollama produced no response text");
            }
            return text;
        } catch (LlmUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Ollama call failed: {}", e.getMessage());
            throw new LlmUnavailableException("Ollama call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String name() {
        return "ollama";
    }
}
