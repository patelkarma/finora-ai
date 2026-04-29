package com.project.financeDashboard.service.email;

/**
 * Vendor-neutral abstraction for transactional email.
 *
 * Two implementations live alongside this interface:
 *   - {@link SmtpEmailProvider}  — Spring Mail / Gmail SMTP (local dev)
 *   - {@link BrevoEmailProvider} — Brevo HTTP API (production / Render)
 *
 * Active provider is selected at boot via {@code email.provider} (smtp | brevo).
 * SMTP is the default since it works everywhere except hosts that block
 * outbound port 587/465 (notably Render's free tier).
 */
public interface EmailProvider {

    void sendOtp(String to, String code);

    void sendMagicLink(String to, String link);

    void sendPasswordResetEmail(String to, String link, int ttlMinutes);

    String name();
}
