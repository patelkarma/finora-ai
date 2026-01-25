package com.project.financeDashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinancialDashboardApplication {
    public static void main(String[] args) {
        SpringApplication.run(FinancialDashboardApplication.class, args);
    }
}

