package com.conversational.system.application.authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.conversational.system.application.authentication.email_sender.EmailSender;
import com.conversational.system.application.authentication.json_web_token.JwtService;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;

@ExtendWith(MockitoExtension.class)
public class PasswordResetTests {

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

    private User testUser;
    private String resetCode;
    private String newPassword;
    private String encodedNewPassword;

    @BeforeEach
    void setUp() {
        testUser = new User("test@example.com", "testuser", "oldEncodedPassword");
        testUser.setId(1);
        testUser.setVerified(true);
        resetCode = "520377";
        newPassword = "newPassword123";
        encodedNewPassword = "encodedNewPassword123";
    }

    @Test
    void testRequestPasswordReset_WithValidEmail_ShouldSucceed() {
        // Arrange
        when(userRepository.findByEmail(testUser.getEmail()))
                .thenReturn(Optional.of(testUser));

        // Act
        authenticationService.resetPasswordRequest(testUser.getEmail());

        // Assert
        verify(userRepository).findByEmail(testUser.getEmail());
        verify(emailSender).sendPasswordResetEmail(eq(testUser.getUsername()), eq(testUser.getEmail()), anyString());
        verify(codeCacheService).savePasswordResetCode(anyString(), eq(testUser.getId()));
    }

    @Test
    void testRequestPasswordReset_WithNonExistentEmail_ShouldThrowException() {
        // Arrange
        String nonExistentEmail = "nonexistent@example.com";
        when(userRepository.findByEmail(nonExistentEmail))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.resetPasswordRequest(nonExistentEmail);
        });

        verify(userRepository).findByEmail(nonExistentEmail);
        verify(emailSender, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
        verify(codeCacheService, never()).savePasswordResetCode(anyString(), any());
    }

    @Test
    void testResetPassword_WithValidCode_ShouldSucceed() {
        // Arrange
        when(codeCacheService.getUserIdByPasswordResetCode(resetCode))
                .thenReturn(testUser.getId());
        when(userRepository.findById(testUser.getId()))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(newPassword))
                .thenReturn(encodedNewPassword);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        authenticationService.resetPassword(resetCode, newPassword);

        // Assert
        verify(codeCacheService).getUserIdByPasswordResetCode(resetCode);
        verify(userRepository).findById(testUser.getId());
        verify(passwordEncoder).encode(newPassword);
        verify(userRepository).save(testUser);
        verify(codeCacheService).deletePasswordResetCode(resetCode);
        assertEquals(encodedNewPassword, testUser.getPasswordHash());
    }

    @Test
    void testResetPassword_WithInvalidCode_ShouldThrowException() {
        // Arrange
        String invalidCode = "999999";
        when(codeCacheService.getUserIdByPasswordResetCode(invalidCode))
                .thenReturn(null);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.resetPassword(invalidCode, newPassword);
        });

        verify(codeCacheService).getUserIdByPasswordResetCode(invalidCode);
        verify(userRepository, never()).findById(any());
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testResetPassword_WithExpiredCode_ShouldThrowException() {
        // Arrange - code exists but user not found (code expired)
        when(codeCacheService.getUserIdByPasswordResetCode(resetCode))
                .thenReturn(999);
        when(userRepository.findById(999))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.resetPassword(resetCode, newPassword);
        });

        verify(codeCacheService).getUserIdByPasswordResetCode(resetCode);
        verify(userRepository).findById(999);
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testResetPassword_WithWeakPassword_ShouldStillSucceed() {
        // Note: Password strength validation should be done on frontend/controller
        // level
        // Service layer should accept any password that passes through
        String weakPassword = "123";
        String encodedWeakPassword = "encoded123";

        // Arrange
        when(codeCacheService.getUserIdByPasswordResetCode(resetCode))
                .thenReturn(testUser.getId());
        when(userRepository.findById(testUser.getId()))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(weakPassword))
                .thenReturn(encodedWeakPassword);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        authenticationService.resetPassword(resetCode, weakPassword);

        // Assert
        verify(passwordEncoder).encode(weakPassword);
        verify(userRepository).save(testUser);
        assertEquals(encodedWeakPassword, testUser.getPasswordHash());
    }
}
