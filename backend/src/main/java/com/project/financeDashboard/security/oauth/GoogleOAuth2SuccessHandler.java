package com.project.financeDashboard.security.oauth;

import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.modal.AuthProvider;
import com.project.financeDashboard.repository.UserRepository;
import com.project.financeDashboard.config.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    // ✅ LIVE FRONTEND URL
    private static final String FRONTEND_URL = "https://finora-frontend-smoky.vercel.app";

    public GoogleOAuth2SuccessHandler(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");
        String googleName = oauthUser.getAttribute("name");

        if (email == null || email.isBlank()) {
            response.sendRedirect(FRONTEND_URL + "/login?oauth_error=true");
            return;
        }

        email = email.toLowerCase();

        User user = userRepository.findByEmail(email).orElse(null);

        boolean isNewUser = false;

        // 🆕 NEW USER FROM GOOGLE
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setName(googleName);
            user.setOauthUser(true);
            user.setVerified(true);
            user.setPasswordSet(false);
            user.setProvider(AuthProvider.GOOGLE);
            isNewUser = true;
        }
        // 🔁 EXISTING USER
        else {
            user.setOauthUser(true);
            user.setProvider(AuthProvider.GOOGLE);

            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(googleName);
            }
        }

        // 🔴 FORCE SAVE TO RAILWAY DB (IMPORTANT)
        user = userRepository.saveAndFlush(user);

        System.out.println("✅ OAuth user saved in DB: " + user.getEmail() + " | ID=" + user.getId());

        // 🚨 VERIFY USER ACTUALLY EXISTS IN DB
        User verifyUser = userRepository.findByEmail(email).orElse(null);

        if (verifyUser == null) {
            System.out.println("❌ USER NOT SAVED IN DB!");
            response.sendRedirect(FRONTEND_URL + "/login?db_error=true");
            return;
        }

        // 🔐 CREATE JWT
        String token = jwtUtil.generateToken(user.getEmail());

        // 🎯 REDIRECT LOGIC
        String redirectURL;

        if (!user.isPasswordSet()) {
            // NEW GOOGLE USER → SET PASSWORD PAGE
            redirectURL = FRONTEND_URL + "/set-password?token=" + token;
            System.out.println("➡️ Redirecting to SET PASSWORD");
        } else {
            // EXISTING USER → NORMAL LOGIN
            redirectURL = FRONTEND_URL + "/oauth-success?token=" + token;
            System.out.println("➡️ Redirecting to OAUTH SUCCESS");
        }

        response.sendRedirect(redirectURL);
    }

}
