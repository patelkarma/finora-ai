package com.project.financeDashboard.dto;

import com.project.financeDashboard.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;

public class ResetPasswordRequest {

    @NotBlank(message = "Token is required")
    private String token;

    @NotBlank(message = "Password is required")
    @StrongPassword
    private String password;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
