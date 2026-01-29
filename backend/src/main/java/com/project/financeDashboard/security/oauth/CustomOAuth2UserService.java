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
