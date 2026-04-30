package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.DetectedAnomaly;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.AnomalyDetectorService;
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
@RequestMapping("/api/anomalies")
@Tag(name = "Anomalies",
        description = "Transactions whose amount deviates significantly from per-category baselines")
public class AnomalyController {

    private final AnomalyDetectorService detector;
    private final UserService userService;

    public AnomalyController(AnomalyDetectorService detector, UserService userService) {
        this.detector = detector;
        this.userService = userService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DetectedAnomaly>> getUserAnomalies(@PathVariable Long userId) {
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
