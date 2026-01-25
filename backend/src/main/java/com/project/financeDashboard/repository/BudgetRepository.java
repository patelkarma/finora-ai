package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.Budget;
import com.project.financeDashboard.modal.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Repo for handling Budget-related DB operations
public interface BudgetRepository extends JpaRepository<Budget, Long> {
    // Find all budgets belonging to a specific user
    List<Budget> findByUser(User user);

    List<Budget> findByUserId(Long userId);
}
