package com.conversational.system.application.authentication.email_sender;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailSender {
    @Value("${spring.mail.username}")
    private String FROM_EMAIL;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String username, String email, String code) {
        final String VERIFICATION_SUBJECT = "Account verification";
        String template = loadTemplate("templates/email/verification_email.html");
        String body = template
                .replace("{{username}}", username)
                .replace("{{verificationCode}}", code);
        sendEmail(email, VERIFICATION_SUBJECT, body);
    }

    public void sendPasswordResetEmail(String username, String email, String code) {
        final String PASSWORD_RESET_SUBJECT = "Password reset request";
        String resetUrl = frontendBaseUrl + "/reset-password?token=" + code;
        String template = loadTemplate("templates/email/password_reset_email.html");
        String body = template
                .replace("{{username}}", username)
                .replace("{{resetUrl}}", resetUrl);

        sendEmail(email, PASSWORD_RESET_SUBJECT, body);
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(FROM_EMAIL);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email.\nReason: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email.\n" + e.getMessage());
        }
    }

    private String loadTemplate(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            byte[] bytes = resource.getInputStream().readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load email template: " + path, e);
        }
    }
}
