package com.project.financeDashboard.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Bean Validation constraint enforcing the Finora password policy:
 *   - at least 8 characters
 *   - contains at least one uppercase letter
 *   - contains at least one lowercase letter
 *   - contains at least one digit
 *   - contains at least one special character
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = StrongPasswordValidator.class)
public @interface StrongPassword {
    String message() default "Password must be 8+ characters and contain uppercase, lowercase, digit and special character";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
