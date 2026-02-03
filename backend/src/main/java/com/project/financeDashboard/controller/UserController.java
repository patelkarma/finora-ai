package com.project.financeDashboard.controller;

import com.project.financeDashboard.modal.User;
import com.project.financeDashboard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@CrossOrigin(origins = {
        "https://finora-frontend-smoky.vercel.app",
        "http://localhost:3000"
})
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        Optional<User> user = userService.findById(id);
        return user.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Update user details (except password for simplicity)
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        Optional<User> userOpt = userService.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();

        user.setName(updatedUser.getName());
        user.setPhone(updatedUser.getPhone());
        user.setSalary(updatedUser.getSalary());

        // ❌ DO NOT allow email change
        // ❌ DO NOT allow verified/oauth flags to change

        User savedUser = userService.updateUser(user);
        return ResponseEntity.ok(savedUser);
    }

}
