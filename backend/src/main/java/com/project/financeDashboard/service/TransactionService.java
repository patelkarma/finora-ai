package com.project.financeDashboard.service;

import com.project.financeDashboard.modal.Transaction;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.repository.TransactionRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public List<Transaction> getTransactionsByUser(User user) {
        return transactionRepository.findByUser(user);
    }

    public List<Transaction> getTransactionsByUserId(Long userId) {
        return transactionRepository.findByUserId(userId);
    }

    public Transaction saveTransaction(@NonNull Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    public Optional<Transaction> findById(@NonNull Long id) {
        return transactionRepository.findById(id);
    }

    public void deleteTransaction(@NonNull Long id) {
        transactionRepository.deleteById(id);
    }
}
