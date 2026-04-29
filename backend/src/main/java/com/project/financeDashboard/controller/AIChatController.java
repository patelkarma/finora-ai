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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI Chat", description = "Conversational AI grounded in the user's transactions and budgets")
public class AIChatController {

    private static final Logger log = LoggerFactory.getLogger(AIChatController.class);

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
}
