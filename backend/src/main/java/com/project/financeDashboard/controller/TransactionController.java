package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.Transaction;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.TransactionService;
import com.project.financeDashboard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = {
        "https://finora-frontend-smoky.vercel.app",
        "https://finora-frontend-patelkarmas-projects.vercel.app",
        "http://localhost:3000"
})
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    public TransactionController(TransactionService transactionService, UserService userService) {
        this.transactionService = transactionService;
        this.userService = userService;
    }

    // Get all transactions for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Transaction>> getTransactionsByUser(@PathVariable Long userId) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Transaction> transactions = transactionService.getTransactionsByUser(userOpt.get());
        return ResponseEntity.ok(transactions);
    }

    // Add new transaction
    @PostMapping("/user/{userId}")
    public ResponseEntity<Transaction> addTransaction(@PathVariable Long userId,
            @RequestBody Transaction transaction) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        transaction.setUser(userOpt.get());
        Transaction saved = transactionService.saveTransaction(transaction);
        return ResponseEntity.ok(saved);
    }

    // ✅ Update existing transaction
    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable Long id,
            @RequestBody Transaction updatedTransaction) {
        Optional<Transaction> existingOpt = transactionService.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Transaction existing = existingOpt.get();
        existing.setUser(existing.getUser());
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
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        transactionService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }
}
