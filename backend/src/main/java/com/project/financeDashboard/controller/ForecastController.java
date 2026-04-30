package com.project.financeDashboard.controller;

import com.project.financeDashboard.dto.ForecastPoint;
import com.project.financeDashboard.model.User;
import com.project.financeDashboard.service.CashFlowForecastService;
import com.project.financeDashboard.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/forecast")
@Tag(name = "Cash-flow Forecast",
        description = "Day-by-day projection of net cash flow combining salary, recurring subscriptions, and discretionary spend")
public class ForecastController {

    private final CashFlowForecastService forecastService;
    private final UserService userService;

    public ForecastController(CashFlowForecastService forecastService, UserService userService) {
        this.forecastService = forecastService;
        this.userService = userService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ForecastPoint>> getUserForecast(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "30") int days) {

        Optional<User> authUser = currentUser();
        if (authUser.isEmpty() || !authUser.get().getId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(forecastService.forecast(userId, days));
    }

    private Optional<User> currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return userService.findByEmail(auth.getName());
    }
}
