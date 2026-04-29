package com.project.financeDashboard.repository;

import com.project.financeDashboard.model.Insight;
import com.project.financeDashboard.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InsightRepository extends JpaRepository<Insight, Long> {
    List<Insight> findByUserOrderByCreatedAtDesc(User user);

    List<Insight> findByUserId(Long userId);

    /** Paginated read backed by idx_insights_user_created. */
    Page<Insight> findByUserId(Long userId, Pageable pageable);
}
