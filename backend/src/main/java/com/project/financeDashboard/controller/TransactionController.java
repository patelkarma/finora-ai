package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.Transaction;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.TransactionService;
import com.project.financeDashboard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    public TransactionController(TransactionService transactionService, UserService userService) {
        this.transactionService = transactionService;
        this.userService = userService;
    }

    private Optional<User> getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email);
    }

    // Get all transactions for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Transaction>> getTransactionsByUser(@PathVariable Long userId) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        List<Transaction> transactions = transactionService.getTransactionsByUser(authUser.get());
        return ResponseEntity.ok(transactions);
    }

    // Add new transaction
    @PostMapping("/user/{userId}")
    public ResponseEntity<Transaction> addTransaction(@PathVariable Long userId,
            @RequestBody Transaction transaction) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        transaction.setUser(authUser.get());
        Transaction saved = transactionService.saveTransaction(transaction);
        return ResponseEntity.ok(saved);
    }

    // Update existing transaction
    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable long id,
            @RequestBody Transaction updatedTransaction) {
        Optional<Transaction> existingOpt = transactionService.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<User> authUser = getAuthenticatedUser();
        Transaction existing = existingOpt.get();
        if (authUser.isEmpty() || !existing.getUser().getId().equals(authUser.get().getId())) {
            return ResponseEntity.status(403).build();
        }

        existing.setDescription(updatedTransaction.getDescription());
        existing.setAmount(updatedTransaction.getAmount());
        existing.setCategory(updatedTransaction.getCategory());
        existing.setTransactionDate(updatedTransaction.getTransactionDate());
        existing.setType(updatedTransaction.getType());

        Transaction saved = transactionService.saveTransaction(existing);
        return ResponseEntity.ok(saved);
    }

    // Delete transaction by id
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable long id) {
        Optional<Transaction> existingOpt = transactionService.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !existingOpt.get().getUser().getId().equals(authUser.get().getId())) {
            return ResponseEntity.status(403).build();
        }

        transactionService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }
}
