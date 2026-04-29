package com.project.financeDashboard.service;

import com.project.financeDashboard.model.PasswordResetToken;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.PasswordResetTokenRepository;
import com.project.financeDashboard.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock UserRepository userRepo;
    @Mock PasswordResetTokenRepository tokenRepo;
    @Mock MailService mailService;
    @Mock PasswordEncoder passwordEncoder;

    @InjectMocks PasswordResetService service;

    @BeforeEach
    void wireConfig() {
        ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com");
        ReflectionTestUtils.setField(service, "ttlMinutes", 30);
    }

    @Test
    void requestReset_unknown_email_does_not_email_or_save() {
        when(userRepo.findByEmail("nobody@x.com")).thenReturn(Optional.empty());

        service.requestReset("nobody@x.com");

        verify(tokenRepo, never()).save(any());
        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyInt());
    }

    @Test
    void requestReset_known_email_stores_hashed_token_and_sends_link() {
        User user = new User();
        when(userRepo.findByEmail("k@x.com")).thenReturn(Optional.of(user));

        service.requestReset("  K@x.com  ");

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepo).deleteAllByUser(user);
        verify(tokenRepo).save(tokenCaptor.capture());
        PasswordResetToken stored = tokenCaptor.getValue();

        // Stored as a SHA-256 hex digest (64 chars), not the raw token
        assertThat(stored.getTokenHash()).hasSize(64).matches("^[a-f0-9]{64}$");
        assertThat(stored.getExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(29));
        assertThat(stored.isUsed()).isFalse();

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetEmail(eq("k@x.com"), linkCaptor.capture(), eq(30));
        assertThat(linkCaptor.getValue()).startsWith("https://example.com/reset-password?token=");
    }

    @Test
    void consumeReset_returns_false_for_unknown_token() {
        when(tokenRepo.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThat(service.consumeReset("nonsense", "Whatever1!")).isFalse();
        verify(userRepo, never()).save(any());
    }

    @Test
    void consumeReset_returns_false_for_expired_token() {
        User user = new User();
        PasswordResetToken expired = new PasswordResetToken(user, "hash", LocalDateTime.now().minusMinutes(1));
        when(tokenRepo.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThat(service.consumeReset("anything", "Strong1!")).isFalse();
        verify(userRepo, never()).save(any());
    }

    @Test
    void consumeReset_updates_password_and_marks_token_used() {
        User user = new User();
        user.setFailedLoginAttempts(3);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(5));

        // sha256("rawtoken123") matches hashed value stored
        String raw = "rawtoken123";
        String hash = PasswordResetService.sha256(raw);
        PasswordResetToken token = new PasswordResetToken(user, hash, LocalDateTime.now().plusMinutes(10));
        when(tokenRepo.findByTokenHash(hash)).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("Strong1!")).thenReturn("HASHED");

        boolean ok = service.consumeReset(raw, "Strong1!");

        assertThat(ok).isTrue();
        assertThat(user.getPassword()).isEqualTo("HASHED");
        assertThat(user.isPasswordSet()).isTrue();
        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        assertThat(token.isUsed()).isTrue();
        verify(userRepo).save(user);
        verify(tokenRepo).save(token);
    }
}
