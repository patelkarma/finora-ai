// package com.project.financeDashboard.security.oauth;

// import com.project.financeDashboard.modal.Role;
// import com.project.financeDashboard.modal.User;
// import com.project.financeDashboard.modal.AuthProvider;
// import com.project.financeDashboard.repository.RoleRepository;
// import com.project.financeDashboard.repository.UserRepository;
// import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
// import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
// import org.springframework.security.oauth2.core.user.OAuth2User;
// import org.springframework.stereotype.Service;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// @Service
// public class CustomOAuth2UserService extends DefaultOAuth2UserService {

//     private final UserRepository userRepository;
//     private final RoleRepository roleRepository;
//     private final PasswordEncoder passwordEncoder;
//     private final Logger logger = LoggerFactory.getLogger(CustomOAuth2UserService.class);

//     public CustomOAuth2UserService(UserRepository userRepository,
//             RoleRepository roleRepository,
//             PasswordEncoder passwordEncoder) {
//         this.userRepository = userRepository;
//         this.roleRepository = roleRepository;
//         this.passwordEncoder = passwordEncoder;
//     }

//     @Override
//     public OAuth2User loadUser(OAuth2UserRequest userRequest) {
//         OAuth2User oauthUser = super.loadUser(userRequest);

//         String email = oauthUser.getAttribute("email");
//         String name = oauthUser.getAttribute("name");

//         if (email == null || email.isEmpty()) {
//             logger.warn("Google OAuth returned no email for userRequest: {}",
//                     userRequest.getClientRegistration().getRegistrationId());
//             return oauthUser;
//         }

//         userRepository.findByEmail(email).orElseGet(() -> {
//             // User newUser = new User();
//             // newUser.setEmail(email);
//             // newUser.setName(name != null ? name : "Google User");
//             // // encoded placeholder password (so DB NOT NULL & hashed)
//             // newUser.setPassword(passwordEncoder.encode("GOOGLE_USER_PLACEHOLDER"));

//             // // Ensure ROLE_USER exists and assign it
//             // Role roleUser = roleRepository.findByName("ROLE_USER")
//             // .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));
//             // newUser.addRole(roleUser);
//             User newUser = new User();
//             newUser.setEmail(email);
//             newUser.setName(name != null ? name : "Google User");
//             newUser.setProvider(AuthProvider.GOOGLE);
//             newUser.setPassword(null);
//             newUser.setPasswordSet(false);
//             Role roleUser = roleRepository.findByName("ROLE_USER")
//                     .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));
//             newUser.addRole(roleUser);

//             return userRepository.save(newUser);
//         });

//         return oauthUser;
//     }
// }

package com.project.financeDashboard.security.oauth;

import com.project.financeDashboard.modal.AuthProvider;
import com.project.financeDashboard.modal.Role;
import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.repository.RoleRepository;
import com.project.financeDashboard.repository.UserRepository;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public CustomOAuth2UserService(UserRepository userRepository,
            RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {
        // JUST LOAD USER, NO DB WRITE
        return super.loadUser(userRequest);
    }
}
