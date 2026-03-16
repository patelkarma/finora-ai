package com.project.financeDashboard.service;

import com.project.financeDashboard.modal.Budget;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.repository.BudgetRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    public List<Budget> getBudgetsByUser(User user) {
        return budgetRepository.findByUser(user);
    }

    public Optional<Budget> findById(@NonNull Long id) {
        return budgetRepository.findById(id);
    }

    public Budget saveBudget(@NonNull Budget budget) {
        return budgetRepository.save(budget);
    }

    public List<Budget> getBudgetsByUserId(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    public void deleteBudget(@NonNull Long id) {
        budgetRepository.deleteById(id);
    }
}
