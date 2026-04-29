package com.project.financeDashboard.service;

import com.project.financeDashboard.config.RedisCacheConfig;
import com.project.financeDashboard.model.Budget;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.BudgetRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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

    @Cacheable(value = RedisCacheConfig.CACHE_BUDGETS, key = "#user.id")
    public List<Budget> getBudgetsByUser(User user) {
        return budgetRepository.findByUser(user);
    }

    @Cacheable(value = RedisCacheConfig.CACHE_BUDGETS, key = "#userId")
    public List<Budget> getBudgetsByUserId(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    public Optional<Budget> findById(@NonNull Long id) {
        return budgetRepository.findById(id);
    }

    @CacheEvict(value = RedisCacheConfig.CACHE_BUDGETS, allEntries = true)
    public Budget saveBudget(@NonNull Budget budget) {
        return budgetRepository.save(budget);
    }

    @CacheEvict(value = RedisCacheConfig.CACHE_BUDGETS, allEntries = true)
    public void deleteBudget(@NonNull Long id) {
        budgetRepository.deleteById(id);
    }
}
