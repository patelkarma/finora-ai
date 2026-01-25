package com.project.financeDashboard.repository;

import com.project.financeDashboard.modal.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repo to handle user stuff like finding by email
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email); // find a user using email
    boolean existsByEmail(String email);      // check if email already exists
}

