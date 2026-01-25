// package com.project.financeDashboard.repository;

// import com.project.financeDashboard.modal.Transaction;
// import com.project.financeDashboard.modal.User;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Query;

// import java.util.List;

// // Repository for transaction stuff
// public interface TransactionRepository extends JpaRepository<Transaction, Long> {
//     // Get all transactions for a particular user
//     @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId")
//     List<Transaction> findByUser(User user);
// }

package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.Transaction;
import com.project.financeDashboard.modal.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Repository for transaction stuff
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    // Get all transactions for a particular user
    List<Transaction> findByUser(User user);

    // New method to fetch by user ID
    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId")
    List<Transaction> findByUserId(@Param("userId") Long userId);
}
