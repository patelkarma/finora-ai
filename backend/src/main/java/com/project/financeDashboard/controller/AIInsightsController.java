package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.Insight;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
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

    @GetMapping("/insights/user/{userId}")
    public ResponseEntity<List<Insight>> getInsightsByUser(@PathVariable Long userId) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        List<Insight> insights = insightsService.getInsightsByUser(userId);
        return ResponseEntity.ok(insights);
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
