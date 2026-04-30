package com.project.financeDashboard.service;

import com.project.financeDashboard.dto.ChatMessage;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.llm.LlmService;
import com.project.financeDashboard.service.rag.RagService;
import com.project.financeDashboard.service.rag.TransactionEmbeddingDao.RelevantTransaction;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ChatService is the prompt-builder. Tests here verify the prompt
 * contains the right blocks based on what RAG returned, and that the
 * service forwards both sync and streaming calls to LlmService cleanly.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChatServiceTest {

    private static User userNamed(String name) {
        User u = new User();
        // User.id has no setter (JPA-generated). Reach in via reflection
        // so the mock-stubbed userService can match on getId() == 1L.
        org.springframework.test.util.ReflectionTestUtils.setField(u, "id", 1L);
        u.setName(name);
        u.setSalary(70000);
        return u;
    }

    private static Transaction expense(String desc, String amount, String category, LocalDate date) {
        Transaction t = new Transaction();
        t.setDescription(desc);
        t.setAmount(new BigDecimal(amount));
        t.setCategory(category);
        t.setType("expense");
        t.setTransactionDate(date);
        return t;
    }

    @Test
    void prompt_includes_user_context_message_and_transactions_when_no_rag() {
        LlmService llm = mock(LlmService.class);
        TransactionService txs = mock(TransactionService.class);
        BudgetService budgets = mock(BudgetService.class);
        ChatService chat = new ChatService(llm, txs, budgets, /* rag */ null);

        when(txs.getTransactionsByUserId(1L)).thenReturn(List.of(
                expense("Pizza", "450", "Food", LocalDate.now().minusDays(2))
        ));
        when(budgets.getBudgetsByUserId(1L)).thenReturn(List.of());
        when(llm.generate(any())).thenReturn("a friendly answer");

        String reply = chat.reply(userNamed("Karma"), List.of(), "what did I spend on food?");

        assertThat(reply).isEqualTo("a friendly answer");

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(llm).generate(prompt.capture());
        String p = prompt.getValue();
        assertThat(p)
                .contains("Karma")                           // user context
                .contains("Recent transactions")             // no-RAG fallback header
                .contains("Pizza")                           // tx description
                .contains("what did I spend on food?")       // user message
                .contains("Assistant:");                     // generation cue
    }

    @Test
    void rag_hit_replaces_recent_n_with_most_relevant_block() {
        LlmService llm = mock(LlmService.class);
        TransactionService txs = mock(TransactionService.class);
        BudgetService budgets = mock(BudgetService.class);
        RagService rag = mock(RagService.class);
        ChatService chat = new ChatService(llm, txs, budgets, rag);

        // RAG returns one match — its presence should suppress the
        // recent-N fallback block.
        RelevantTransaction match = new RelevantTransaction(
                42L, new BigDecimal("450"), "Food", "expense",
                "Domino's pizza", LocalDate.now().minusDays(2), 0.12);
        when(rag.retrieveRelevant(1L, "what did I spend on food?")).thenReturn(List.of(match));
        when(budgets.getBudgetsByUserId(1L)).thenReturn(List.of());
        when(llm.generate(any())).thenReturn("ok");

        chat.reply(userNamed("Karma"), List.of(), "what did I spend on food?");

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(llm).generate(prompt.capture());
        String p = prompt.getValue();

        assertThat(p)
                .contains("Most relevant transactions")
                .contains("Domino's pizza")
                .doesNotContain("Recent transactions (newest first");
    }

    @Test
    void rag_empty_falls_back_to_recent_transactions_block() {
        LlmService llm = mock(LlmService.class);
        TransactionService txs = mock(TransactionService.class);
        BudgetService budgets = mock(BudgetService.class);
        RagService rag = mock(RagService.class);
        ChatService chat = new ChatService(llm, txs, budgets, rag);

        // RAG present but returns empty (new user, no embeddings yet).
        // Service must fall back to the recent-N block.
        when(rag.retrieveRelevant(1L, "any question")).thenReturn(List.of());
        when(txs.getTransactionsByUserId(1L)).thenReturn(List.of(
                expense("Coffee", "150", "Coffee", LocalDate.now().minusDays(1))
        ));
        when(budgets.getBudgetsByUserId(1L)).thenReturn(List.of());
        when(llm.generate(any())).thenReturn("ok");

        chat.reply(userNamed("Karma"), List.of(), "any question");

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(llm).generate(prompt.capture());
        String p = prompt.getValue();

        assertThat(p)
                .contains("Recent transactions")
                .contains("Coffee");
    }

    @Test
    void prior_history_is_rendered_in_chronological_order() {
        LlmService llm = mock(LlmService.class);
        TransactionService txs = mock(TransactionService.class);
        BudgetService budgets = mock(BudgetService.class);
        ChatService chat = new ChatService(llm, txs, budgets, null);

        when(txs.getTransactionsByUserId(1L)).thenReturn(List.of());
        when(budgets.getBudgetsByUserId(1L)).thenReturn(List.of());
        when(llm.generate(any())).thenReturn("ok");

        ChatMessage userTurn = new ChatMessage();
        userTurn.setRole("user");
        userTurn.setContent("How am I doing?");
        ChatMessage assistantTurn = new ChatMessage();
        assistantTurn.setRole("assistant");
        assistantTurn.setContent("You're doing fine.");

        chat.reply(userNamed("Karma"), List.of(userTurn, assistantTurn), "Cool, thanks.");

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(llm).generate(prompt.capture());
        String p = prompt.getValue();

        // Earlier user turn must appear before the assistant turn.
        int userIdx = p.indexOf("User: How am I doing?");
        int asstIdx = p.indexOf("Assistant: You're doing fine.");
        assertThat(userIdx).isPositive();
        assertThat(asstIdx).isGreaterThan(userIdx);
    }

    @Test
    void replyStream_forwards_provider_chunks_to_consumer() {
        LlmService llm = mock(LlmService.class);
        TransactionService txs = mock(TransactionService.class);
        BudgetService budgets = mock(BudgetService.class);
        ChatService chat = new ChatService(llm, txs, budgets, null);

        when(txs.getTransactionsByUserId(1L)).thenReturn(List.of());
        when(budgets.getBudgetsByUserId(1L)).thenReturn(List.of());

        // LlmService.generateStream is void; stub it to invoke the consumer
        // with three fake tokens.
        doAnswer(invocation -> {
            Consumer<String> onChunk = invocation.getArgument(1);
            onChunk.accept("Hello ");
            onChunk.accept("Karma");
            onChunk.accept("!");
            return null;
        }).when(llm).generateStream(any(), any());

        List<String> received = new ArrayList<>();
        chat.replyStream(userNamed("Karma"), List.of(), "hi", received::add);

        assertThat(received).containsExactly("Hello ", "Karma", "!");
    }
}
