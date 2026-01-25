package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;


import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    @Modifying
    @Transactional
    void deleteByEmail(String email);

    Optional<OtpCode> findFirstByEmailOrderByIdDesc(String email);
}
