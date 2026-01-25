// package com.project.financeDashboard.security.oauth;

// import com.project.financeDashboard.modal.User;
// import com.project.financeDashboard.repository.UserRepository;
// import com.project.financeDashboard.service.JwtService;
// import jakarta.servlet.ServletException;
// import jakarta.servlet.http.HttpServletRequest;
// import jakarta.servlet.http.HttpServletResponse;
// import org.springframework.security.core.Authentication;
// import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
// import org.springframework.stereotype.Component;

// import java.io.IOException;
// import java.util.Optional;

// @Component
// public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

//     private final JwtService jwtService;
//     private final UserRepository userRepository;

//     public GoogleOAuth2SuccessHandler(JwtService jwtService, UserRepository userRepository) {
//         this.jwtService = jwtService;
//         this.userRepository = userRepository;
//     }

//     @Override
//     public void onAuthenticationSuccess(
//             HttpServletRequest request,
//             HttpServletResponse response,
//             Authentication authentication) throws IOException, ServletException {

//         String email = authentication.getName();

//         Optional<User> userOptional = userRepository.findByEmail(email);
//         if (userOptional.isEmpty()) {
//             response.sendError(HttpServletResponse.SC_BAD_REQUEST, "User not found");
//             return;
//         }

//         User user = userOptional.get();
//         String token = jwtService.generateToken(user.getEmail());

//         // Redirect to frontend with token
//         String redirectURL = "http://localhost:3000/oauth-success?token=" + token;
//         response.sendRedirect(redirectURL);
//     }
// }

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
            response.sendRedirect("http://localhost:3000/login?oauth_error=true");
            return;
        }

        email = email.toLowerCase();

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // ✅ CREATE ONCE
            user = new User();
            user.setEmail(email);
            user.setName(googleName);
            user.setOauthUser(true);
            user.setVerified(true); // ✅ NO OTP EVER
            user.setPasswordSet(false);
            user.setProvider(AuthProvider.GOOGLE);
            userRepository.save(user);

        } else {
            // ✅ DO NOT OVERWRITE EXISTING DATA
            user.setOauthUser(true);
            user.setProvider(AuthProvider.GOOGLE);

            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(googleName);
            }

            userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());

        String redirectURL = !user.isPasswordSet()
                ? "http://localhost:3000/set-password?token=" + token
                : "http://localhost:3000/oauth-success?token=" + token;

        response.sendRedirect(redirectURL);
    }

}
