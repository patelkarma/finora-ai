package com.project.financeDashboard.service;

import com.project.financeDashboard.service.email.EmailProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Thin facade that delegates to whichever {@link EmailProvider} Spring picked
 * at boot ({@code email.provider=smtp|brevo}). Keeping the existing class name
 * means callers in AuthController / PasswordResetService don't change when
 * the underlying transport is swapped.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final EmailProvider provider;

    public MailService(EmailProvider provider) {
        this.provider = provider;
        log.info("MailService initialized with email provider: {}", provider.name());
    }

    public void sendOtp(String to, String code) {
        provider.sendOtp(to, code);
    }

    public void sendMagicLink(String to, String link) {
        provider.sendMagicLink(to, link);
    }

    public void sendPasswordResetEmail(String to, String link, int ttlMinutes) {
        provider.sendPasswordResetEmail(to, link, ttlMinutes);
    }
}
