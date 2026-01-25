package com.project.financeDashboard.service;

import com.project.financeDashboard.modal.Budget;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.repository.BudgetRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    // Get all budgets of a user
    public List<Budget> getBudgetsByUser(User user) {
        return budgetRepository.findByUser(user);
    }

    // Find budget by ID
    public Optional<Budget> findById(Long id) {
        return budgetRepository.findById(id);
    }

    // Save or update a budget
    public Budget saveBudget(Budget budget) {
        return budgetRepository.save(budget);
    }

    public List<Budget> getBudgetsByUserId(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    // Delete a budget by ID
    public void deleteBudget(Long id) {
        budgetRepository.deleteById(id);
    }
}
