package com.project.financeDashboard.controller;

import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User profile read/update")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private Optional<User> getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByEmail(email);
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(id)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(authUser.get());
    }

    // Update user details (except password)
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        Optional<User> authUser = getAuthenticatedUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(id)) {
            return ResponseEntity.status(403).build();
        }

        User user = authUser.get();
        user.setName(updatedUser.getName());
        user.setPhone(updatedUser.getPhone());
        user.setSalary(updatedUser.getSalary());

        User savedUser = userService.updateUser(user);
        return ResponseEntity.ok(savedUser);
    }
}
