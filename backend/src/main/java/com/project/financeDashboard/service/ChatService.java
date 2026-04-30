package com.project.financeDashboard.service;

import com.project.financeDashboard.dto.ChatMessage;
import com.project.financeDashboard.model.Budget;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.llm.LlmService;
import com.project.financeDashboard.service.rag.RagService;
import com.project.financeDashboard.service.rag.TransactionEmbeddingDao.RelevantTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * Builds the chat prompt and calls the LLM. The prompt format is:
 *
 *   <system> — role + answer style + the user's financial context
 *   <history> — previous turns in chronological order
 *   <user>    — the new message
 *
 * Provider is wrapped with circuit-breaker + retry + cache via
 * {@link LlmService}, so identical prompts cache for an hour and a sick
 * upstream returns a graceful fallback instead of a 500.
 */
@Service
public class ChatService {

    private static final int RECENT_TX_FOR_CONTEXT = 30;

    private final LlmService llmService;
    private final TransactionService transactionService;
    private final BudgetService budgetService;
    /** Optional — null when {@code rag.enabled=false}. */
    private final RagService ragService;

    public ChatService(LlmService llmService,
                       TransactionService transactionService,
                       BudgetService budgetService,
                       @Autowired(required = false) RagService ragService) {
        this.llmService = llmService;
        this.transactionService = transactionService;
        this.budgetService = budgetService;
        this.ragService = ragService;
    }

    public String reply(User user, List<ChatMessage> history, String message) {
        String prompt = buildPrompt(user, history, message);
        return llmService.generate(prompt);
    }

    /**
     * Streaming reply. Tokens are forwarded to {@code onChunk} as soon as
     * the provider emits them — the controller wraps that consumer in an
     * {@code SseEmitter.send(...)} call so the frontend renders tokens
     * incrementally.
     */
    public void replyStream(User user, List<ChatMessage> history, String message, Consumer<String> onChunk) {
        String prompt = buildPrompt(user, history, message);
        llmService.generateStream(prompt, onChunk);
    }

    private String buildPrompt(User user, List<ChatMessage> history, String message) {
        StringBuilder sb = new StringBuilder(2048);

        sb.append("You are Finora, a friendly personal-finance assistant. ");
        sb.append("Answer in 2-4 sentences unless the user asks for detail. ");
        sb.append("Use the user's actual transactions and budgets when relevant. ");
        sb.append("If a question is outside personal finance, politely steer back. ");
        sb.append("Never invent numbers — only reference data shown below.\n\n");

        sb.append("---- USER CONTEXT ----\n");
        sb.append("Name: ").append(user.getName() != null ? user.getName() : "(unknown)").append("\n");
        if (user.getSalary() != null) {
            sb.append("Stated monthly income: ₹").append(user.getSalary()).append("\n");
        }

        // RAG: if available and the user has indexed transactions, retrieve
        // the most semantically relevant rows for THIS question. Otherwise
        // fall back to the recent-30 strategy. The RAG pre-check is cheap
        // (single COUNT) and short-circuits to empty for new users without
        // any embedded rows, so the fallback path is automatic.
        Optional<List<RelevantTransaction>> relevant = ragService != null
                ? Optional.of(ragService.retrieveRelevant(user.getId(), message))
                : Optional.empty();

        if (relevant.isPresent() && !relevant.get().isEmpty()) {
            sb.append("Most relevant transactions (top ").append(relevant.get().size())
                    .append(", retrieved by semantic similarity):\n");
            relevant.get().forEach(r -> sb.append("- ")
                    .append(r.type()).append(" ")
                    .append("₹").append(r.amount()).append(" ")
                    .append("[").append(r.category() != null ? r.category() : "Uncategorized").append("] ")
                    .append("on ").append(r.transactionDate())
                    .append(r.description() != null && !r.description().isBlank()
                            ? " — " + r.description() : "")
                    .append("\n"));
        } else {
            // Fallback: dump recent-N. Used when rag is disabled, the user
            // has no embeddings yet, or retrieval failed.
            List<Transaction> txs = transactionService.getTransactionsByUserId(user.getId());
            if (txs == null || txs.isEmpty()) {
                sb.append("Transactions: (none recorded)\n");
            } else {
                sb.append("Recent transactions (newest first, up to ").append(RECENT_TX_FOR_CONTEXT).append("):\n");
                txs.stream()
                        .sorted((a, b) -> compareDates(b.getTransactionDate(), a.getTransactionDate()))
                        .limit(RECENT_TX_FOR_CONTEXT)
                        .forEach(t -> sb.append("- ")
                                .append(t.getType()).append(" ")
                                .append("₹").append(t.getAmount()).append(" ")
                                .append("[").append(t.getCategory() != null ? t.getCategory() : "Uncategorized").append("] ")
                                .append("on ").append(t.getTransactionDate())
                                .append(t.getDescription() != null && !t.getDescription().isBlank()
                                        ? " — " + t.getDescription() : "")
                                .append("\n"));
            }
        }

        // Budgets
        List<Budget> budgets = budgetService.getBudgetsByUserId(user.getId());
        if (budgets == null || budgets.isEmpty()) {
            sb.append("Budgets: (none set)\n");
        } else {
            sb.append("Budgets:\n");
            budgets.forEach(b -> sb.append("- ")
                    .append(b.getCategory()).append(": ₹").append(b.getAmount())
                    .append(" / ").append(b.getPeriod()).append("\n"));
        }
        sb.append("----\n\n");

        // Prior conversation
        if (history != null && !history.isEmpty()) {
            sb.append("Conversation so far:\n");
            for (ChatMessage m : history) {
                sb.append(m.getRole().equals("user") ? "User: " : "Assistant: ")
                        .append(m.getContent()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("User: ").append(message).append("\nAssistant:");
        return sb.toString();
    }

    private int compareDates(LocalDate a, LocalDate b) {
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        return a.compareTo(b);
    }

    public String activeProviderName() {
        return llmService.activeProviderName();
    }
}
