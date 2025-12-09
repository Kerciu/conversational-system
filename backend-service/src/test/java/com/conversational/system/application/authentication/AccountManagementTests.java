package com.conversational.system.application.authentication;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.conversational.system.application.authentication.email_sender.EmailSender;
import com.conversational.system.application.authentication.json_web_token.JwtService;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;

@ExtendWith(MockitoExtension.class)
public class AccountManagementTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private OAuth2Service oauth2Service;

    @Mock
    private EmailSender emailSender;

    @Mock
    private CodeCacheService codeCacheService;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void verifyAccount_ShouldVerifyUser_WhenCodeIsValid() {
        String verificationCode = "valid-code";
        Integer userId = 1;
        User user = new User("test@example.com", "testuser", "hashedpassword");
        user.setId(userId);
        user.setVerified(false);

        when(codeCacheService.getUserIdByVerificationCode(verificationCode)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        authenticationService.verifyAccount(verificationCode);

        assertTrue(user.isVerified());
        verify(userRepository).save(user);
        verify(codeCacheService).deleteVerificationCode(verificationCode);
    }

    @Test
    void verifyAccount_ShouldThrowException_WhenCodeIsInvalid() {
        String verificationCode = "invalid-code";
        when(codeCacheService.getUserIdByVerificationCode(verificationCode)).thenReturn(null);

        assertThrows(RuntimeException.class, () -> {
            authenticationService.verifyAccount(verificationCode);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPasswordRequest_ShouldSendEmail_WhenUserExists() {
        String email = "test@example.com";
        User user = new User(email, "testuser", "hashedpassword");
        user.setId(1);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        authenticationService.resetPasswordRequest(email);

        verify(codeCacheService).savePasswordResetCode(anyString(), eq(user.getId()));
        verify(emailSender).sendPasswordResetEmail(eq("testuser"), eq(email), anyString());
    }

    @Test
    void resetPasswordRequest_ShouldThrowException_WhenUserNotFound() {
        String email = "nonexistent@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> {
            authenticationService.resetPasswordRequest(email);
        });

        verify(emailSender, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void resetPassword_ShouldUpdatePassword_WhenCodeIsValid() {
        String resetCode = "valid-reset-code";
        String newPassword = "newPassword123";
        String encodedPassword = "encodedNewPassword";
        Integer userId = 1;
        User user = new User("test@example.com", "testuser", "oldpassword");
        user.setId(userId);

        when(codeCacheService.getUserIdByPasswordResetCode(resetCode)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(newPassword)).thenReturn(encodedPassword);

        authenticationService.resetPassword(resetCode, newPassword);

        assertEquals(encodedPassword, user.getPasswordHash());
        verify(userRepository).save(user);
        verify(codeCacheService).deletePasswordResetCode(resetCode);
    }

    @Test
    void resetPassword_ShouldThrowException_WhenCodeIsInvalid() {
        String resetCode = "invalid-reset-code";
        when(codeCacheService.getUserIdByPasswordResetCode(resetCode)).thenReturn(null);

        assertThrows(RuntimeException.class, () -> {
            authenticationService.resetPassword(resetCode, "newPassword");
        });

        verify(userRepository, never()).save(any(User.class));
    }
}
