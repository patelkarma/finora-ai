package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.Budget;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.BudgetService;
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
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;

    public BudgetController(BudgetService budgetService, UserService userService) {
        this.budgetService = budgetService;
        this.userService = userService;
    }

    // Get all budgets for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Budget>> getBudgetsByUser(@PathVariable Long userId) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Budget> budgets = budgetService.getBudgetsByUser(userOpt.get());
        return ResponseEntity.ok(budgets);
    }

    // Add a new budget for a user
    @PostMapping("/user/{userId}")
    public ResponseEntity<Budget> addBudget(@PathVariable Long userId, @RequestBody Budget budget) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        budget.setUser(userOpt.get());
        Budget savedBudget = budgetService.saveBudget(budget);
        return ResponseEntity.ok(savedBudget);
    }

    // Update a budget
    @PutMapping("/{id}")
    public ResponseEntity<Budget> updateBudget(@PathVariable Long id, @RequestBody Budget updatedBudget) {
        Optional<Budget> budgetOpt = budgetService.findById(id);
        if (budgetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Budget budget = budgetOpt.get();
        budget.setCategory(updatedBudget.getCategory());
        budget.setAmount(updatedBudget.getAmount());
        budget.setPeriod(updatedBudget.getPeriod());
        Budget savedBudget = budgetService.saveBudget(budget);
        return ResponseEntity.ok(savedBudget);
    }

    // Delete a budget
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable Long id) {
        Optional<Budget> budgetOpt = budgetService.findById(id);
        if (budgetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        budgetService.deleteBudget(id);
        return ResponseEntity.noContent().build();
    }
}
