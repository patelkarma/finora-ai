package com.project.financeDashboard.exception;

// Just a custom exception for throwing app-specific errors
public class CustomException extends RuntimeException {

    // constructor to pass error message
    public CustomException(String message) {
        super(message);
    }
}
