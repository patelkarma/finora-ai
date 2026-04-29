package com.project.financeDashboard.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class StrongPasswordValidatorTest {

    private final StrongPasswordValidator validator = new StrongPasswordValidator();

    @Test
    void rejectsNull() {
        assertThat(validator.isValid(null, null)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "short1!",          // < 8 chars
            "alllowercase1!",   // no uppercase
            "ALLUPPERCASE1!",   // no lowercase
            "NoDigitsHere!",    // no digit
            "NoSpecial123",     // no special char
            "        "          // whitespace only
    })
    void rejectsWeakPasswords(String password) {
        assertThat(validator.isValid(password, null)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Str0ng!Pass",
            "Aa1!aaaa",
            "Correcthorse-Battery1Staple",
            "P@ssw0rd"
    })
    void acceptsStrongPasswords(String password) {
        assertThat(validator.isValid(password, null)).isTrue();
    }
}
