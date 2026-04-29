package com.project.financeDashboard.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Returns a uniform JSON error envelope:
 * { "timestamp": ..., "status": 400, "error": "Bad Request",
 *   "message": "Validation failed", "path": "/api/...",
 *   "fields": { "email": "Email must be valid", ... } }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, WebRequest req) {
        Map<String, String> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe ->
                fields.merge(fe.getField(),
                        fe.getDefaultMessage() == null ? "invalid" : fe.getDefaultMessage(),
                        (a, b) -> a + "; " + b));
        return build(HttpStatus.BAD_REQUEST, "Validation failed", req, fields);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraint(ConstraintViolationException ex, WebRequest req) {
        Map<String, String> fields = new HashMap<>();
        ex.getConstraintViolations().forEach(cv ->
                fields.put(cv.getPropertyPath().toString(), cv.getMessage()));
        return build(HttpStatus.BAD_REQUEST, "Validation failed", req, fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex, WebRequest req) {
        return build(HttpStatus.BAD_REQUEST, "Malformed JSON request", req, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex, WebRequest req) {
        return build(HttpStatus.FORBIDDEN, "Forbidden", req, null);
    }

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<Map<String, Object>> handleCustom(CustomException ex, WebRequest req) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex, WebRequest req) {
        log.error("Unhandled exception at {}", req.getDescription(false), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", req, null);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message,
                                                       WebRequest req, Map<String, String> fields) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        String desc = req.getDescription(false);
        body.put("path", desc.startsWith("uri=") ? desc.substring(4) : desc);
        if (fields != null && !fields.isEmpty()) {
            body.put("fields", fields);
        }
        return ResponseEntity.status(status).body(body);
    }
}
