package com.project.financeDashboard.service.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Brevo (formerly Sendinblue) transactional email via HTTP API.
 *
 * Used in production because Render's free tier blocks outbound SMTP
 * (ports 25/465/587/2525) — HTTP egress is not blocked. Free tier is
 * 300 emails/day, plenty for OTP + password reset traffic.
 *
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * Auth: api-key header
 * Sender email must be a verified sender in the Brevo dashboard.
 *
 * Active when {@code email.provider=brevo}.
 */
@Component
@ConditionalOnProperty(name = "email.provider", havingValue = "brevo")
public class BrevoEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(BrevoEmailProvider.class);
    private static final String API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${spring.mail.from}")
    private String fromAddress;

    @Value("${brevo.sender-name:Finora}")
    private String senderName;

    private final RestTemplate restTemplate;

    public BrevoEmailProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public void sendOtp(String to, String code) {
        String text = "Your OTP code is: " + code + "\nIt will expire in 5 minutes.";
        send(to, "Your Finora OTP", text);
    }

    @Override
    public void sendMagicLink(String to, String link) {
        send(to, "Your Finora Magic Link", "Click to sign in: " + link);
    }

    @Override
    public void sendPasswordResetEmail(String to, String link, int ttlMinutes) {
        String text =
                "We received a request to reset your Finora password.\n\n" +
                "Click the link below to choose a new password (valid for " + ttlMinutes + " minutes):\n\n" +
                link + "\n\n" +
                "If you did not request this, you can safely ignore this email — your password will not change.\n";
        send(to, "Reset your Finora password", text);
    }

    private void send(String to, String subject, String textContent) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new MailSendException("BREVO_API_KEY is not configured");
        }
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new MailSendException("Sender address (spring.mail.from / MAIL_NAME) is not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("api-key", apiKey);

        Map<String, Object> body = Map.of(
                "sender", Map.of("name", senderName, "email", fromAddress),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "textContent", textContent
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, request, String.class);
            // Brevo returns 201 Created on success. 2xx is what we want.
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new MailSendException("Brevo HTTP " + response.getStatusCode() + ": " + response.getBody());
            }
            log.info("Brevo email sent to {} (subject: {})", to, subject);
        } catch (RestClientException e) {
            // RestTemplate throws on non-2xx by default; surface upstream as MailSendException
            // so existing callers (e.g. AuthController's try/catch) handle it the same way as
            // Spring Mail SMTP failures.
            throw new MailSendException("Brevo API call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String name() {
        return "brevo";
    }
}
