package com.project.financeDashboard.repository;

import com.project.financeDashboard.model.PasswordResetToken;
import com.project.financeDashboard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Transactional
    @Query("delete from PasswordResetToken t where t.user = :user")
    void deleteAllByUser(User user);

    @Modifying
    @Transactional
    @Query("delete from PasswordResetToken t where t.expiresAt < :before or t.used = true")
    void deleteExpiredOrUsed(LocalDateTime before);
}
