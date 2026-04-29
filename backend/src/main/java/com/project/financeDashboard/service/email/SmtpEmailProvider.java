package com.project.financeDashboard.service.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Spring Mail / Gmail SMTP provider. Default for local development.
 *
 * Render's free tier blocks outbound SMTP, so production should set
 * {@code EMAIL_PROVIDER=brevo} to switch to {@link BrevoEmailProvider}.
 */
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "smtp", matchIfMissing = true)
public class SmtpEmailProvider implements EmailProvider {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromAddress;

    public SmtpEmailProvider(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtp(String to, String code) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Your Finora OTP");
        msg.setText("Your OTP code is: " + code + "\nIt will expire in 5 minutes.");
        mailSender.send(msg);
    }

    @Override
    public void sendMagicLink(String to, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Your Finora Magic Link");
        msg.setText("Click to sign in: " + link);
        mailSender.send(msg);
    }

    @Override
    public void sendPasswordResetEmail(String to, String link, int ttlMinutes) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Reset your Finora password");
        msg.setText(
                "We received a request to reset your Finora password.\n\n" +
                "Click the link below to choose a new password (valid for " + ttlMinutes + " minutes):\n\n" +
                link + "\n\n" +
                "If you did not request this, you can safely ignore this email — your password will not change.\n"
        );
        mailSender.send(msg);
    }

    @Override
    public String name() {
        return "smtp";
    }
}
