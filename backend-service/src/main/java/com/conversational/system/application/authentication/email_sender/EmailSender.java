package com.conversational.system.application.authentication.email_sender;



import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;


import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class EmailSender {
    @Value("${spring.mail.username}")
    private String FROM_EMAIL;

    @Value("${app.frontend.base-url}")                    
    private String frontendBaseUrl;

    private final JavaMailSender mailSender;
    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    public void sendVerificationEmail(String username, String email, String code) {
        final String VERIFICATION_SUBJECT = "Account verification";
        String verificationUrl = frontendBaseUrl + "/verify-email?token=" + code;
        String template = loadTemplate("templates/email/verification_email.html");
        String body = template
                            .replace("{{username}}", username)
                            .replace("{{verificationUrl}}", verificationUrl);
        sendEmail(email, VERIFICATION_SUBJECT, body);
    }

    
    public void sendPasswordResetEmail(String username, String email, String code) {
        final String PASSWORD_RESET_SUBJECT = "Password reset request";
        String verificationUrl = frontendBaseUrl + "/reset-password?token=" + code;
        String template = loadTemplate("templates/email/password_reset_email.html");
        String body = template
                            .replace("{{username}}", username)
                            .replace("{{verificationUrl}}", verificationUrl);

        sendEmail(email, PASSWORD_RESET_SUBJECT, body);
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            System.out.println("Sending email to: " + to);
            System.out.println("From: " + FROM_EMAIL);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);
            
            helper.setTo(to);
            helper.setFrom(FROM_EMAIL);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        }
        catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send email.\nReason: " + e.getMessage(), e);
        }
        catch (Exception e) {
            throw new RuntimeException("Failed to send email.\n" + e.getMessage());
        }
    }

    // Prostą prywatną metodę do wczytania pliku
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
