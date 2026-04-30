package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.ChatRequest;
import com.project.financeDashboard.dto.ChatResponse;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.ChatService;
import com.project.financeDashboard.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI Chat", description = "Conversational AI grounded in the user's transactions and budgets")
public class AIChatController {

    private static final Logger log = LoggerFactory.getLogger(AIChatController.class);

    /** SSE timeout — generous enough that a long Gemini reply doesn't die mid-token. */
    private static final long SSE_TIMEOUT_MS = 120_000L;

    private final ChatService chatService;
    private final UserService userService;

    public AIChatController(ChatService chatService, UserService userService) {
        this.chatService = chatService;
        this.userService = userService;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody ChatRequest req) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Not authenticated");
        }

        User user = userOpt.get();
        log.info("Chat request from user={} historyTurns={} messageLen={}",
                user.getId(), req.getHistory().size(), req.getMessage().length());

        String reply = chatService.reply(user, req.getHistory(), req.getMessage());
        return ResponseEntity.ok(new ChatResponse(reply, chatService.activeProviderName()));
    }

    /**
     * Streaming chat. Returns text/event-stream. Each token chunk arrives
     * as a {@code message} event; an {@code event: done} marks completion;
     * a fatal upstream failure closes with {@code event: error}.
     *
     * <p>The frontend reads the response body via fetch + ReadableStream,
     * parses SSE frames, and appends chunks to the assistant bubble as
     * they arrive — ChatGPT-style "tokens-popping-in" UX.
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@Valid @RequestBody ChatRequest req) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userService.findByEmail(email);

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

        if (userOpt.isEmpty()) {
            sendErrorAndComplete(emitter, "not authenticated");
            return emitter;
        }

        User user = userOpt.get();
        log.info("Chat stream from user={} historyTurns={} messageLen={}",
                user.getId(), req.getHistory().size(), req.getMessage().length());

        // Run on a separate thread so the HTTP container thread isn't held.
        // ForkJoinPool.commonPool is fine — the work is mostly I/O on the
        // upstream LLM connection, low CPU contention.
        CompletableFuture.runAsync(() -> {
            try {
                chatService.replyStream(user, req.getHistory(), req.getMessage(), chunk -> {
                    try {
                        emitter.send(SseEmitter.event().data(chunk));
                    } catch (IOException ioe) {
                        // Client disconnected — abort the stream.
                        emitter.completeWithError(ioe);
                        throw new RuntimeException(ioe);
                    }
                });
                emitter.send(SseEmitter.event().name("done").data("ok"));
                emitter.complete();
            } catch (Throwable t) {
                log.warn("Chat stream failed for user={}: {}", user.getId(), t.toString());
                sendErrorAndComplete(emitter, friendlyError(t));
            }
        });

        return emitter;
    }

    private static void sendErrorAndComplete(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().name("error").data(message));
            emitter.complete();
        } catch (IOException ignored) {
            emitter.completeWithError(ignored);
        }
    }

    private static String friendlyError(Throwable t) {
        String msg = t.getMessage();
        if (msg == null || msg.isBlank()) return "stream failed";
        // Strip noisy provider details from the user-facing message.
        if (msg.length() > 200) return msg.substring(0, 200);
        return msg;
    }
}
