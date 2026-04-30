package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.DetectedSubscription;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.SubscriptionDetectorService;
import com.project.financeDashboard.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/subscriptions")
@Tag(name = "Subscriptions",
        description = "Auto-detected recurring expenses inferred from transaction history")
public class SubscriptionController {

    private final SubscriptionDetectorService detector;
    private final UserService userService;

    public SubscriptionController(SubscriptionDetectorService detector, UserService userService) {
        this.detector = detector;
        this.userService = userService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DetectedSubscription>> getUserSubscriptions(@PathVariable Long userId) {
        Optional<User> authUser = currentUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(detector.detect(userId));
    }

    private Optional<User> currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return userService.findByEmail(auth.getName());
    }
}
