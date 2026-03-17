package com.project.financeDashboard.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromAddress;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String to, String code) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Your Finora OTP");
        msg.setText("Your OTP code is: " + code + "\nIt will expire in 5 minutes.");
        mailSender.send(msg);
    }

    public void sendMagicLink(String to, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Your Finora Magic Link");
        msg.setText("Click to sign in: " + link);
        mailSender.send(msg);
    }
}
