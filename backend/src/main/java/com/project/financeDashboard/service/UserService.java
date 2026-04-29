package com.project.financeDashboard.service;

import com.project.financeDashboard.model.AuthProvider;
import com.project.financeDashboard.model.Role;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.repository.RoleRepository;
import com.project.financeDashboard.repository.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<User> findById(@NonNull Long id) {
        return userRepository.findById(id);
    }

    public User updateUser(@NonNull User user) {
        return userRepository.save(user);
    }

    public Optional<User> getUserById(@NonNull Long id) {
        return userRepository.findById(id);
    }

    public User registerUser(String name, String email, String password) {
        User user = new User();
        user.setName(name.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(password));

        user.setVerified(true);
        user.setOauthUser(false);
        user.setPasswordSet(true);
        user.setProvider(AuthProvider.LOCAL);

        Role roleUser = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER")));

        user.addRole(roleUser);

        return userRepository.save(user);
    }

    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public void recordFailedAttempt(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
        if (user.getFailedLoginAttempts() >= 5) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
        }
        userRepository.save(user);
    }

    public void resetFailure(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }
}
