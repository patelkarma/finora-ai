package com.project.financeDashboard.repository;

import com.project.financeDashboard.model.Transaction;
import com.project.financeDashboard.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /** Unbounded — kept only for internal callers that need the full set
     *  (e.g. AI insight prompt building). Don't use for user-facing endpoints. */
    List<Transaction> findByUser(User user);

    List<Transaction> findByUserId(Long userId);

    /** Paginated read for user-facing endpoints. The composite index
     *  idx_transactions_user_date satisfies this query. */
    Page<Transaction> findByUserId(Long userId, Pageable pageable);
}
