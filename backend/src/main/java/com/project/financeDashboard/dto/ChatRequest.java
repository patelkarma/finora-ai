package com.project.financeDashboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

/**
 * Inbound request to the chat endpoint.
 *
 * @param message the user's new message
 * @param history prior turns (capped at 20 to keep prompt size bounded);
 *                the new message is NOT in history — it's appended after
 *                history when building the prompt.
 */
public class ChatRequest {

    @NotBlank(message = "message is required")
    @Size(max = 4000, message = "message must be under 4000 characters")
    private String message;

    @Size(max = 20, message = "history is capped at 20 messages")
    private List<@Valid ChatMessage> history = new ArrayList<>();

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public List<ChatMessage> getHistory() { return history; }
    public void setHistory(List<ChatMessage> history) { this.history = history == null ? new ArrayList<>() : history; }
}
