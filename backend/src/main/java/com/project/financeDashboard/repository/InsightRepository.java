package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.Insight;
import com.project.financeDashboard.modal.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InsightRepository extends JpaRepository<Insight, Long> {
    List<Insight> findByUserOrderByCreatedAtDesc(User user);

    List<Insight> findByUserId(Long userId);
}
