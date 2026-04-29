package com.project.financeDashboard.controller;

import com.project.financeDashboard.model.Insight;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI Insights", description = "Generate and retrieve LLM-powered financial insights")
public class AIInsightsController {

    private final InsightsService insightsService;
    private final UserService userService;
    private final TransactionService transactionService;
    private final BudgetService budgetService;

    public AIInsightsController(
            InsightsService insightsService,
            UserService userService,
            TransactionService transactionService,
            BudgetService budgetService) {
        this.insightsService = insightsService;
        this.userService = userService;
        this.transactionService = transactionService;
        this.budgetService = budgetService;
    }

    private Optional<User> getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email);
    }

    @PostMapping("/insights/generate")
    public ResponseEntity<?> generateInsight(@RequestParam Long userId) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        try {
            User user = authUser.get();
            String prompt = buildPrompt(user);
            Insight saved = insightsService.generateAndSaveAIInsight(user, prompt);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating AI insight: " + e.getMessage());
        }
    }

    /**
     * Paginated insights for the user, ordered by created_at DESC by default.
     * Backed by composite index idx_insights_user_created.
     */
    @GetMapping("/insights/user/{userId}")
    public ResponseEntity<Page<Insight>> getInsightsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        size = Math.min(Math.max(size, 1), 100);
        String[] parts = sort.split(",");
        Sort sortSpec = parts.length == 1
                ? Sort.by(parts[0])
                : Sort.by(parts[1].equalsIgnoreCase("desc")
                        ? Sort.Direction.DESC : Sort.Direction.ASC, parts[0]);
        Pageable pageable = PageRequest.of(page, size, sortSpec);

        Page<Insight> result = insightsService.getInsightsPage(userId, pageable);
        return ResponseEntity.ok(result);
    }

    private String buildPrompt(User user) {
        var txs = transactionService.getTransactionsByUserId(user.getId());
        var budgets = budgetService.getBudgetsByUserId(user.getId());

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a smart financial assistant AI. ")
                .append("Analyze the following data and give 2-3 sentences of personalized financial advice in a friendly tone.\n");

        prompt.append("User name: ").append(user.getName() != null ? user.getName() : "Unknown").append("\n");

        prompt.append("\nTransactions:\n");
        if (txs == null || txs.isEmpty()) {
            prompt.append("- No transactions recorded.\n");
        } else {
            for (var t : txs) {
                prompt.append(String.format("- %s: ₹%s on %s\n",
                        t.getCategory() != null ? t.getCategory() : "General",
                        t.getAmount(),
                        t.getTransactionDate() != null ? t.getTransactionDate() : "unknown date"));
            }
        }

        prompt.append("\nBudgets:\n");
        if (budgets == null || budgets.isEmpty()) {
            prompt.append("- No budgets set.\n");
        } else {
            for (var b : budgets) {
                prompt.append(String.format("- %s: ₹%s limit\n", b.getCategory(), b.getAmount()));
            }
        }

        prompt.append("\nNow, generate a short financial insight or suggestion based on these data points.");
        return prompt.toString();
    }
}
