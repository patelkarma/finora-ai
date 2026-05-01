package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.BulkImportRequest;
import com.project.financeDashboard.dto.ImportResult;
import com.project.financeDashboard.dto.ImportRow;
import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.TransactionService;
import com.project.financeDashboard.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/transactions")
@Tag(name = "Transactions", description = "Create, read, update and delete user transactions")
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

    /**
     * Paginated transactions for the user, ordered by transaction_date DESC
     * by default. Backed by composite index idx_transactions_user_date so the
     * filter and sort are satisfied from a single index lookup.
     *
     * <p>Query params (all optional):
     * <ul>
     *   <li>{@code page}  — zero-based page index, default 0</li>
     *   <li>{@code size}  — page size, default 20, capped at 100</li>
     *   <li>{@code sort}  — e.g. {@code transactionDate,desc}</li>
     * </ul>
     *
     * <p>Response shape is Spring's standard Page envelope:
     * <pre>{ content: [...], totalElements, totalPages, number, size, ... }</pre>
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<Transaction>> getTransactionsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "transactionDate,desc") String sort) {

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        // Cap size to prevent abusive "give me everything" requests now that
        // pagination is the contract. 100 is more than enough for a single
        // dashboard page.
        size = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));

        Page<Transaction> result = transactionService.getTransactionsPage(userId, pageable);
        return ResponseEntity.ok(result);
    }

    private Sort parseSort(String raw) {
        // Accepts "field" or "field,direction"; defaults to ASC if direction omitted.
        String[] parts = raw.split(",");
        if (parts.length == 1) return Sort.by(parts[0]);
        Sort.Direction direction = parts[1].equalsIgnoreCase("desc")
                ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, parts[0]);
    }

    // Add new transaction
    @PostMapping("/user/{userId}")
    public ResponseEntity<Transaction> addTransaction(@PathVariable Long userId,
            @Valid @RequestBody Transaction transaction) {
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
            @Valid @RequestBody Transaction updatedTransaction) {
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

    /**
     * CSV bulk import. Frontend parses the file client-side, shows a
     * preview, and POSTs the parsed rows as JSON — keeps multipart out
     * of the wire format and lets the user fix bad rows before they hit
     * the backend. All rows save in one transaction (rollback on any
     * failure) so a partial import never leaves the user with mystery
     * half-state.
     */
    @PostMapping("/user/{userId}/import")
    public ResponseEntity<ImportResult> importTransactions(
            @PathVariable Long userId,
            @Valid @RequestBody BulkImportRequest body) {

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        List<Transaction> drafts = new ArrayList<>(body.getRows().size());
        for (ImportRow row : body.getRows()) {
            Transaction t = new Transaction();
            t.setAmount(row.getAmount().setScale(2, RoundingMode.HALF_UP));
            t.setCategory(row.getCategory().trim());
            t.setType(row.getType());
            String desc = row.getDescription();
            t.setDescription(desc == null || desc.isBlank() ? row.getCategory().trim() : desc.trim());
            t.setTransactionDate(row.getDate());
            drafts.add(t);
        }

        List<Transaction> saved = transactionService.bulkSave(authUser.get(), drafts);
        return ResponseEntity.ok(new ImportResult(saved.size()));
    }

    /**
     * Bulk delete by ids. Returns {deleted: N}. Ids belonging to other
     * users are silently skipped at the service layer; we don't fail
     * the whole batch for a stale id either.
     */
    @PostMapping("/user/{userId}/bulk-delete")
    public ResponseEntity<Map<String, Integer>> bulkDelete(
            @PathVariable Long userId,
            @RequestBody Map<String, List<Long>> body) {

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        List<Long> ids = body.getOrDefault("ids", List.of());
        int deleted = transactionService.bulkDelete(userId, ids);
        return ResponseEntity.ok(Map.of("deleted", deleted));
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
