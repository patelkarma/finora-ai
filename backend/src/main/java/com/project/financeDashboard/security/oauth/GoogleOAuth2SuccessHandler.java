package com.project.financeDashboard.security.oauth;

import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.modal.AuthProvider;
import com.project.financeDashboard.repository.UserRepository;
import com.project.financeDashboard.config.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Value("${frontend.url}")
    private String frontendUrl;

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
            response.sendRedirect(frontendUrl + "/login?oauth_error=true");
            return;
        }

        email = email.toLowerCase();

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setName(googleName);
            user.setOauthUser(true);
            user.setVerified(true);
            user.setPasswordSet(false);
            user.setProvider(AuthProvider.GOOGLE);
        } else {
            user.setOauthUser(true);
            user.setProvider(AuthProvider.GOOGLE);

            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(googleName);
            }
        }

        user = userRepository.saveAndFlush(user);

        User verifyUser = userRepository.findByEmail(email).orElse(null);
        if (verifyUser == null) {
            response.sendRedirect(frontendUrl + "/login?db_error=true");
            return;
        }

        String token = jwtUtil.generateToken(user.getEmail());

        String redirectURL;
        if (!user.isPasswordSet()) {
            redirectURL = frontendUrl + "/set-password?token=" + token;
        } else {
            redirectURL = frontendUrl + "/oauth-success?token=" + token;
        }

        response.sendRedirect(redirectURL);
    }
}
