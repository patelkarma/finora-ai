package com.project.financeDashboard.controller;

import com.project.financeDashboard.config.JwtAuthFilter;
import com.project.financeDashboard.config.JwtUtil;
import com.project.financeDashboard.config.RateLimitConfig;
import com.project.financeDashboard.config.SecurityConfig;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.ChatService;
import com.project.financeDashboard.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice tests for the chat endpoint. Streaming SSE is exercised separately
 * because Spring's MockMvc doesn't play well with async SseEmitter; here we
 * verify the synchronous /chat path: ownership wiring and validation. The
 * SSE endpoint shares the same auth resolution code path, so this gives us
 * the meaningful coverage for that branch.
 */
@WebMvcTest(
        controllers = AIChatController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthFilter.class, RateLimitConfig.class}))
@AutoConfigureMockMvc(addFilters = false)
class AIChatControllerTest {

    private static final String AUTH_EMAIL = "alice@example.com";

    @Autowired MockMvc mockMvc;

    @MockBean ChatService chatService;
    @MockBean UserService userService;
    @MockBean JwtUtil jwtUtil;

    private User authUser;

    @BeforeEach
    void setUp() {
        authUser = new User("Alice", AUTH_EMAIL, "hashed");
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(authUser, 1L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void chat_happyPath_returnsReply() throws Exception {
        when(userService.findByEmail(AUTH_EMAIL)).thenReturn(Optional.of(authUser));
        when(chatService.reply(eq(authUser), any(), eq("How much did I spend on food?")))
                .thenReturn("You spent ₹3,200 on food this month.");
        when(chatService.activeProviderName()).thenReturn("gemini");

        String body = """
                {"message":"How much did I spend on food?","history":[]}
                """;
        mockMvc.perform(post("/api/ai/chat").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value("You spent ₹3,200 on food this month."))
                .andExpect(jsonPath("$.provider").value("gemini"));
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void chat_userNotFound_returns401() throws Exception {
        when(userService.findByEmail(AUTH_EMAIL)).thenReturn(Optional.empty());

        String body = """
                {"message":"hi","history":[]}
                """;
        mockMvc.perform(post("/api/ai/chat").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());

        verify(chatService, never()).reply(any(), any(), any());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void chat_blankMessage_returns400() throws Exception {
        // @NotBlank on ChatRequest.message must reject empty strings.
        String body = """
                {"message":"","history":[]}
                """;
        mockMvc.perform(post("/api/ai/chat").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());

        verify(chatService, never()).reply(any(), any(), any());
    }

    @Test
    @WithMockUser(username = AUTH_EMAIL)
    void chat_messageTooLong_returns400() throws Exception {
        // @Size(max=4000) must reject 4001-char messages.
        String giant = "a".repeat(4001);
        String body = "{\"message\":\"" + giant + "\",\"history\":[]}";
        mockMvc.perform(post("/api/ai/chat").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());

        verify(chatService, never()).reply(any(), any(), any());
    }
}
