package com.project.financeDashboard.service;

import com.project.financeDashboard.model.PasswordResetToken;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.PasswordResetTokenRepository;
import com.project.financeDashboard.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * Forgot/reset-password flow.
 *
 * Security model:
 *   - Raw token is sent only once, in the email link. We store SHA-256(token) only.
 *   - Tokens expire in {password.reset.ttl-minutes} minutes (default 30).
 *   - Tokens are single-use; on consumption we mark used = true and bump password.
 *   - Forgot-password endpoint must always return 200 to avoid email-enumeration.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository userRepo;
    private final PasswordResetTokenRepository tokenRepo;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${frontend.url}")
    private String frontendUrl;

    @Value("${password.reset.ttl-minutes:30}")
    private int ttlMinutes;

    public PasswordResetService(UserRepository userRepo,
                                PasswordResetTokenRepository tokenRepo,
                                MailService mailService,
                                PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.mailService = mailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestReset(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) return;
        String email = rawEmail.trim().toLowerCase();

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            // intentionally silent — do not leak which emails are registered
            log.info("Password reset requested for unknown email: {}", email);
            return;
        }
        User user = userOpt.get();

        // invalidate any prior outstanding tokens for this user
        tokenRepo.deleteAllByUser(user);

        String rawToken = generateRawToken();
        String hash = sha256(rawToken);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(ttlMinutes);

        tokenRepo.save(new PasswordResetToken(user, hash, expiresAt));

        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
        try {
            mailService.sendPasswordResetEmail(email, resetLink, ttlMinutes);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", email, e.getMessage());
            // we still return 200 from the controller — do not leak the failure
        }
    }

    @Transactional
    public boolean consumeReset(String rawToken, String newPassword) {
        if (rawToken == null || newPassword == null) return false;

        String hash = sha256(rawToken);
        Optional<PasswordResetToken> opt = tokenRepo.findByTokenHash(hash);
        if (opt.isEmpty()) return false;

        PasswordResetToken token = opt.get();
        if (token.isUsed() || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordSet(true);
        // unlock the account in case it was locked when they forgot their password
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepo.save(user);

        token.setUsed(true);
        tokenRepo.save(token);
        return true;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
