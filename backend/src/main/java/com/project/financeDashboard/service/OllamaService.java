package com.project.financeDashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class OllamaService {

    @Value("${ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${ollama.model:mistral:7b}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public OllamaService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateInsightFromAI(String prompt) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("prompt", prompt);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // ✅ Proper JSON serialization
            String jsonBody = mapper.writeValueAsString(body);
            HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    ollamaUrl + "/api/generate", request, String.class);

            if (response.getStatusCode() != HttpStatus.OK) {
                return "❌ Error contacting Ollama: " + response.getStatusCode() +
                        " on POST request for \"" + ollamaUrl + "/api/generate\"";
            }

            String responseBody = response.getBody();
            if (responseBody == null || responseBody.isBlank()) {
                return "⚠️ Empty response from Ollama.";
            }

            // ✅ Ollama streams multiple JSON objects per line; extract "response" fields
            StringBuilder result = new StringBuilder();
            for (String line : responseBody.split("\n")) {
                if (!line.trim().isEmpty()) {
                    JsonNode node = mapper.readTree(line);
                    if (node.has("response")) {
                        result.append(node.get("response").asText());
                    }
                }
            }

            return result.length() > 0 ? result.toString().trim() : "⚠️ No response text found.";

        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Error contacting Ollama: " + e.getMessage();
        }
    }
}
