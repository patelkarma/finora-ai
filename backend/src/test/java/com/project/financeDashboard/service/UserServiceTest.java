package com.project.financeDashboard.service;

import com.project.financeDashboard.model.AuthProvider;
import com.project.financeDashboard.model.Role;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.RoleRepository;
import com.project.financeDashboard.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks UserService userService;

    @Test
    void registerUser_persists_with_encoded_password_and_role() {
        when(passwordEncoder.encode("plain-pw")).thenReturn("hashed-pw");
        when(roleRepository.findByName("ROLE_USER"))
                .thenReturn(Optional.of(new Role("ROLE_USER")));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = userService.registerUser("Karma", "  Karma@Example.COM ", "plain-pw");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User persisted = captor.getValue();

        assertThat(saved).isSameAs(persisted);
        assertThat(persisted.getEmail()).isEqualTo("karma@example.com"); // trimmed + lowercased
        assertThat(persisted.getName()).isEqualTo("Karma");
        assertThat(persisted.getPassword()).isEqualTo("hashed-pw");
        assertThat(persisted.isVerified()).isTrue();
        assertThat(persisted.isPasswordSet()).isTrue();
        assertThat(persisted.isOauthUser()).isFalse();
        assertThat(persisted.getProvider()).isEqualTo(AuthProvider.LOCAL);
        assertThat(persisted.getRoles()).extracting(Role::getName).containsExactly("ROLE_USER");
    }

    @Test
    void recordFailedAttempt_increments_counter_until_threshold() {
        User user = new User();
        user.setFailedLoginAttempts(2);

        userService.recordFailedAttempt(user);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(3);
        assertThat(user.getLockedUntil()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void recordFailedAttempt_locks_account_at_fifth_failure() {
        User user = new User();
        user.setFailedLoginAttempts(4);

        LocalDateTime before = LocalDateTime.now();
        userService.recordFailedAttempt(user);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isNotNull();
        // Lockout should be ~15 minutes in the future
        assertThat(user.getLockedUntil()).isAfter(before.plusMinutes(14));
        assertThat(user.getLockedUntil()).isBefore(before.plusMinutes(16));
    }

    @Test
    void resetFailure_clears_counter_and_lock() {
        User user = new User();
        user.setFailedLoginAttempts(7);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));

        userService.resetFailure(user);

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        verify(userRepository).save(user);
    }
}
