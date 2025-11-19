package com.conversational.system.application.authentication.email_sender;



import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.conversational.system.application.entities.user.User;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class EmailSender {
    @Value("${spring.mail.username}")
    private String FROM_EMAIL;
    private final JavaMailSender mailSender;
    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    public void sendVerificationEmail(User user) {
        // TODO:
        //  import template from file
        //  personalize template with verification link containing the verification code
        //  personalize template with username

        final String VERIFICATION_SUBJECT = "Account verification";
        final String VERIFICATION_BODY_TEMPLATE = "VERIFICATION LINK HERE";
        sendEmail(user.getEmail(), VERIFICATION_SUBJECT, VERIFICATION_BODY_TEMPLATE);
    }

    public void sendPasswordResetEmail() {
        // TODO: password reset email
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            System.out.println("Sending email to: " + to);
            System.out.println("From: " + FROM_EMAIL);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);
            
            helper.setTo(to);
            helper.setFrom(FROM_EMAIL);
            helper.setSubject(subject);
            helper.setText(body);
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
}
