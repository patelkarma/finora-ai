
package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
    List<LoginHistory> findByUserIdOrderByTimestampDesc(Long userId);

    List<LoginHistory> findByEmailOrderByTimestampDesc(String email);
}
