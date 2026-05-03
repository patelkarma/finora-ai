package com.project.financeDashboard.controller;

import com.project.financeDashboard.config.JwtAuthFilter;
import com.project.financeDashboard.config.JwtUtil;
import com.project.financeDashboard.config.RateLimitConfig;
import com.project.financeDashboard.config.SecurityConfig;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.LoginHistoryRepository;
import com.project.financeDashboard.repository.OtpCodeRepository;
import com.project.financeDashboard.repository.UserRepository;
import com.project.financeDashboard.service.MailService;
import com.project.financeDashboard.service.PasswordResetService;
import com.project.financeDashboard.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice tests for AuthController. Same pattern as TransactionControllerTest:
 * security filters off, all collaborators mocked. We focus on the business
 * branches the controller owns directly — signup duplicate handling, login
 * failure recording, password reset success/failure — and skip OTP / OAuth
 * paths since those are more about email + Google integrations than the
 * controller's own logic.
 */
@WebMvcTest(
        controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthFilter.class, RateLimitConfig.class}))
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean UserService userService;
    @MockBean UserRepository userRepository;
    @MockBean AuthenticationManager authenticationManager;
    @MockBean JwtUtil jwtUtil;
    @MockBean MailService mailService;
    @MockBean OtpCodeRepository otpRepo;
    @MockBean LoginHistoryRepository loginHistoryRepo;
    @MockBean PasswordEncoder passwordEncoder;
    @MockBean PasswordResetService passwordResetService;

    // ------------------------------------------------------------------
    // POST /api/auth/signup
    // ------------------------------------------------------------------

    @Test
    void signup_newUser_returns200AndPersists() throws Exception {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$encoded");

        String body = """
                {"name":"Alice","email":"alice@example.com","password":"Test123!","phone":"5551234"}
                """;
        mockMvc.perform(post("/api/auth/signup").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Account created successfully"));

        verify(userRepository).save(any(User.class));
    }

    @Test
    void signup_existingNonOauthUser_returns409() throws Exception {
        User existing = new User("Alice", "alice@example.com", "hashed");
        existing.setPasswordSet(true);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(existing));

        String body = """
                {"name":"Alice","email":"alice@example.com","password":"Test123!"}
                """;
        mockMvc.perform(post("/api/auth/signup").contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("User already exists"));

        verify(userRepository, never()).save(any());
    }

    @Test
    void signup_invalidEmail_returns400() throws Exception {
        String body = """
                {"name":"Alice","email":"not-an-email","password":"Test123!"}
                """;
        mockMvc.perform(post("/api/auth/signup").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        verify(userRepository, never()).save(any());
    }

    @Test
    void signup_weakPassword_returns400() throws Exception {
        // "weakpass" has no upper, digit, or symbol — @StrongPassword should reject.
        String body = """
                {"name":"Alice","email":"alice@example.com","password":"weakpass"}
                """;
        mockMvc.perform(post("/api/auth/signup").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        verify(userRepository, never()).save(any());
    }

    // ------------------------------------------------------------------
    // POST /api/auth/login
    // ------------------------------------------------------------------

    @Test
    void login_invalidCredentials_returns401AndRecordsFailure() throws Exception {
        User user = new User("Alice", "alice@example.com", "hashed");
        user.setVerified(true);
        user.setPasswordSet(true);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("bad creds"));

        String body = """
                {"email":"alice@example.com","password":"wrongPass1!"}
                """;
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password!"));

        verify(userService).recordFailedAttempt(user);
    }

    @Test
    void login_missingEmail_returns400() throws Exception {
        String body = "{\"password\":\"Test123!\"}";
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------
    // POST /api/auth/forgot-password
    // ------------------------------------------------------------------

    @Test
    void forgotPassword_alwaysReturns200_evenForUnknownEmail() throws Exception {
        // The controller intentionally returns 200 regardless to prevent
        // email-enumeration. We just verify the service was called.
        String body = "{\"email\":\"never-existed@example.com\"}";
        mockMvc.perform(post("/api/auth/forgot-password").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "If an account exists for this email, a reset link has been sent."));

        verify(passwordResetService).requestReset("never-existed@example.com");
    }

    // ------------------------------------------------------------------
    // POST /api/auth/reset-password
    // ------------------------------------------------------------------

    @Test
    void resetPassword_validToken_returns200() throws Exception {
        when(passwordResetService.consumeReset("valid-token", "Test123!")).thenReturn(true);

        String body = """
                {"token":"valid-token","password":"Test123!"}
                """;
        mockMvc.perform(post("/api/auth/reset-password").contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset successfully"));
    }

    @Test
    void resetPassword_invalidOrExpiredToken_returns400() throws Exception {
        when(passwordResetService.consumeReset(anyString(), anyString())).thenReturn(false);

        String body = """
                {"token":"expired-token","password":"Test123!"}
                """;
        mockMvc.perform(post("/api/auth/reset-password").contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Reset link is invalid or has expired"));
    }
}
