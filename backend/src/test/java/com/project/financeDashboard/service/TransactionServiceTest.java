package com.project.financeDashboard.service;

import com.project.financeDashboard.event.TransactionSavedEvent;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock TransactionRepository transactionRepository;
    @Mock ApplicationEventPublisher events;
    @InjectMocks TransactionService transactionService;

    @Test
    void getTransactionsByUserId_delegates_to_repository() {
        Transaction t = new Transaction();
        when(transactionRepository.findByUserId(42L)).thenReturn(List.of(t));

        List<Transaction> result = transactionService.getTransactionsByUserId(42L);

        assertThat(result).containsExactly(t);
        verify(transactionRepository).findByUserId(42L);
    }

    @Test
    void saveTransaction_persists_and_publishes_event() {
        User user = new User();
        Transaction tx = new Transaction(user, new BigDecimal("100.00"), "Food", "expense", "lunch", LocalDate.now());
        when(transactionRepository.save(tx)).thenReturn(tx);

        Transaction saved = transactionService.saveTransaction(tx);

        assertThat(saved).isSameAs(tx);
        verify(transactionRepository).save(tx);

        // Event must carry the saved entity so the RAG indexer has the
        // generated id available for the embedding upsert.
        ArgumentCaptor<TransactionSavedEvent> evt = ArgumentCaptor.forClass(TransactionSavedEvent.class);
        verify(events).publishEvent(evt.capture());
        assertThat(evt.getValue().transaction()).isSameAs(tx);
    }

    @Test
    void findById_returns_optional_from_repo() {
        when(transactionRepository.findById(7L)).thenReturn(Optional.empty());

        assertThat(transactionService.findById(7L)).isEmpty();
        verify(transactionRepository).findById(7L);
    }

    @Test
    void deleteTransaction_calls_repository_deleteById() {
        transactionService.deleteTransaction(99L);
        verify(transactionRepository).deleteById(99L);
        verifyNoMoreInteractions(transactionRepository);
    }
}
