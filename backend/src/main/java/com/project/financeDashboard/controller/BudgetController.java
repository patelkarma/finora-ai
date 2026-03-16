package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.Budget;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.BudgetService;
import com.project.financeDashboard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;

    public BudgetController(BudgetService budgetService, UserService userService) {
        this.budgetService = budgetService;
        this.userService = userService;
    }

    private Optional<User> getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email);
    }

    // Get all budgets for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Budget>> getBudgetsByUser(@PathVariable Long userId) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        List<Budget> budgets = budgetService.getBudgetsByUser(authUser.get());
        return ResponseEntity.ok(budgets);
    }

    // Add a new budget for a user
    @PostMapping("/user/{userId}")
    public ResponseEntity<Budget> addBudget(@PathVariable Long userId, @RequestBody Budget budget) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        budget.setUser(authUser.get());
        Budget savedBudget = budgetService.saveBudget(budget);
        return ResponseEntity.ok(savedBudget);
    }

    // Update a budget
    @PutMapping("/{id}")
    public ResponseEntity<Budget> updateBudget(@PathVariable long id, @RequestBody Budget updatedBudget) {
        Optional<Budget> budgetOpt = budgetService.findById(id);
        if (budgetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<User> authUser = getAuthenticatedUser();
        Budget budget = budgetOpt.get();
        if (authUser.isEmpty() || !budget.getUser().getId().equals(authUser.get().getId())) {
            return ResponseEntity.status(403).build();
        }

        budget.setCategory(updatedBudget.getCategory());
        budget.setAmount(updatedBudget.getAmount());
        budget.setPeriod(updatedBudget.getPeriod());
        Budget savedBudget = budgetService.saveBudget(budget);
        return ResponseEntity.ok(savedBudget);
    }

    // Delete a budget
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable long id) {
        Optional<Budget> budgetOpt = budgetService.findById(id);
        if (budgetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !budgetOpt.get().getUser().getId().equals(authUser.get().getId())) {
            return ResponseEntity.status(403).build();
        }

        budgetService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }
}
