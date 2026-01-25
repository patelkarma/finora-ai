package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.LoginRequest;
import com.project.financeDashboard.modal.LoginHistory;
import com.project.financeDashboard.modal.OtpCode;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.repository.LoginHistoryRepository;
import com.project.financeDashboard.repository.OtpCodeRepository;
import com.project.financeDashboard.repository.UserRepository;
import com.project.financeDashboard.service.MailService;
import com.project.financeDashboard.service.UserService;
import com.project.financeDashboard.config.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final MailService mailService;
    private final OtpCodeRepository otpRepo;
    private final LoginHistoryRepository loginHistoryRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserService userService,
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            JwtUtil jwtUtil,
            MailService mailService,
            OtpCodeRepository otpRepo,
            LoginHistoryRepository loginHistoryRepo,
            PasswordEncoder passwordEncoder) {

        this.userService = userService;
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.mailService = mailService;
        this.otpRepo = otpRepo;
        this.loginHistoryRepo = loginHistoryRepo;
        this.passwordEncoder = passwordEncoder;
    }

    // SIGNUP (unchanged, reuse existing)
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body) {

        String name = body.get("name");
        String email = body.get("email");
        String password = body.get("password");
        String phone = body.get("phone");

        if (email == null || password == null || name == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Name, email and password are required"));
        }

        email = email.trim().toLowerCase();

        // ❌ Prevent duplicate users
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "User already exists"));
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password)); // ✅ PASSWORD SAVED
        user.setPasswordSet(true);
        user.setVerified(true); // ✅ OTP already verified
        user.setOauthUser(false);
        user.setPhone(phone);

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Account created successfully"));
    }

    // LOGIN (password) with brute-force check + history
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String email = loginRequest.getEmail() == null ? "" : loginRequest.getEmail().trim().toLowerCase();
        Optional<User> uOpt = userRepository.findByEmail(email);
        String ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");

        try {
            if (uOpt.isPresent()) {
                User user = uOpt.get();

                if (!user.isVerified()) {
                    return ResponseEntity.status(403)
                            .body(Map.of("message", "Please verify your email using OTP"));
                }

                if (user.isOauthUser() && !user.isPasswordSet()) {
                    return ResponseEntity.status(403)
                            .body(Map.of("message", "Please set your password first"));
                }
            }

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = jwtUtil.generateToken(authentication.getName());
            Optional<User> userOpt = userRepository.findByEmail(authentication.getName());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(500).body(Map.of("message", "Authenticated but user not found"));
            }

            User user = userOpt.get();
            // reset failures
            userService.resetFailure(user);

            loginHistoryRepo.save(createHistory(user.getId(), user.getEmail(), ip, ua, true));
            Map<String, Object> resp = Map.of("token", jwt, "user",
                    Map.of("id", user.getId(), "name", user.getName(), "email", user.getEmail()));
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            // authentication failed: record failure
            uOpt.ifPresent(userService::recordFailedAttempt);
            loginHistoryRepo.save(createHistory(uOpt.map(User::getId).orElse(null), email, ip, ua, false));
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password!"));
        }
    }

    // REQUEST OTP
    @Transactional
    @PostMapping("/request-otp")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email required"));
        email = email.trim().toLowerCase();

        // create code
        String code = String.format("%06d", new Random().nextInt(999999));
        LocalDateTime exp = LocalDateTime.now().plusMinutes(5);

        // delete previous and save new
        otpRepo.deleteByEmail(email);
        OtpCode otp = new OtpCode(email, code, exp);
        otpRepo.save(otp);

        // send email
        mailService.sendOtp(email, code);

        return ResponseEntity.ok(Map.of("message", "OTP sent", "resendCooldownSeconds", 15));
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing token"));
        }

        String password = body.get("password");
        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Password must be at least 6 characters"));
        }

        String token = authHeader.substring(7);

        String email;
        try {
            email = jwtUtil.extractUsername(token);
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid or expired token"));
        }

        if (email == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid token (email missing)"));
        }

        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(password));
        user.setPasswordSet(true);

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password set successfully"));
    }

    // VERIFY OTP
    @Transactional
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String email = body.get("email");
        String code = String.valueOf(body.get("code")).trim();
        if (email == null || code == null)
            return ResponseEntity.badRequest().body(Map.of("message", "email+code required"));
        email = email.trim().toLowerCase();

        var opt = otpRepo.findFirstByEmailOrderByIdDesc(email);
        if (opt.isEmpty())
            return ResponseEntity.status(400).body(Map.of("message", "No OTP requested"));

        OtpCode otp = opt.get();
        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRepo.deleteByEmail(email);
            return ResponseEntity.status(400).body(Map.of("message", "OTP expired"));
        }

        if (!otp.getCode().equals(code.trim())) {
            // record failed attempt if user exists
            userRepository.findByEmail(email).ifPresent(userService::recordFailedAttempt);
            return ResponseEntity.status(401).body(Map.of("message", "Invalid OTP"));
        }

        // OK: delete OTP, issue JWT, log history
        otpRepo.deleteByEmail(email);
        // OTP is valid → mark email verified ONLY
        otpRepo.deleteByEmail(email);

        // If user exists, mark verified = true
        userRepository.findByEmail(email).ifPresent(user -> {
            if (!user.isVerified()) {
                user.setVerified(true);
                userRepository.save(user);
            }
        });

        // ❌ DO NOT create user here
        // ❌ DO NOT login here
        // ❌ DO NOT generate token here

        return ResponseEntity.ok(Map.of(
                "message", "Email verified successfully"));

    }

    // get login history for a user
    @GetMapping("/login-history/{userId}")
    public ResponseEntity<?> getLoginHistory(@PathVariable Long userId) {
        var list = loginHistoryRepo.findByUserIdOrderByTimestampDesc(userId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getLoggedInUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing token"));
        }
        String token = authHeader.substring(7);
        String email;
        try {
            email = jwtUtil.extractUsername(token);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid token"));
        }

        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "salary", user.getSalary())))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("message", "User not found")));
    }

    // helper
    private LoginHistory createHistory(Long userId, String email, String ip, String ua, boolean success) {
        LoginHistory h = new LoginHistory();
        h.setUserId(userId);
        h.setEmail(email);
        h.setIp(ip);
        h.setUserAgent(ua);
        h.setSuccess(success);
        h.setTimestamp(LocalDateTime.now());
        return h;
    }
}
