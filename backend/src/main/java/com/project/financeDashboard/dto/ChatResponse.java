package com.project.financeDashboard.dto;

public class ChatResponse {
    private String reply;
    private String provider;

    public ChatResponse() {}

    public ChatResponse(String reply, String provider) {
        this.reply = reply;
        this.provider = provider;
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
}
