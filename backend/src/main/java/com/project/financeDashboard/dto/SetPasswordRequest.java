package com.project.financeDashboard.dto;

import com.project.financeDashboard.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;

public class SetPasswordRequest {

    @NotBlank(message = "Password is required")
    @StrongPassword
    private String password;

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
