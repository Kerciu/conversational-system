package com.conversational.system.application.authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
public class EmailVerificationTests {

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
    private String verificationCode;

    @BeforeEach
    void setUp() {
        testUser = new User("test@example.com", "testuser", "encodedPassword");
        testUser.setId(1);
        testUser.setVerified(false);
        verificationCode = "123456";
    }

    @Test
    void testVerifyAccount_WithValidCode_ShouldSucceed() {
        // Arrange
        when(codeCacheService.getUserIdByVerificationCode(verificationCode))
                .thenReturn(testUser.getId());
        when(userRepository.findById(testUser.getId()))
                .thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        authenticationService.verifyAccount(verificationCode);

        // Assert
        verify(codeCacheService).getUserIdByVerificationCode(verificationCode);
        verify(userRepository).findById(testUser.getId());
        verify(userRepository).save(testUser);
        verify(codeCacheService).deleteVerificationCode(verificationCode);
        assertTrue(testUser.isVerified());
    }

    @Test
    void testVerifyAccount_WithInvalidCode_ShouldThrowException() {
        // Arrange
        String invalidCode = "999999";
        when(codeCacheService.getUserIdByVerificationCode(invalidCode))
                .thenReturn(null);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.verifyAccount(invalidCode);
        });

        verify(codeCacheService).getUserIdByVerificationCode(invalidCode);
        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testVerifyAccount_WithExpiredCode_ShouldThrowException() {
        // Arrange - code exists but user not found (code expired and user deleted)
        when(codeCacheService.getUserIdByVerificationCode(verificationCode))
                .thenReturn(999);
        when(userRepository.findById(999))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.verifyAccount(verificationCode);
        });

        verify(codeCacheService).getUserIdByVerificationCode(verificationCode);
        verify(userRepository).findById(999);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testResendVerificationEmail_WithValidEmail_ShouldSucceed() {
        // Arrange
        testUser.setVerified(false);
        when(userRepository.findByEmail(testUser.getEmail()))
                .thenReturn(Optional.of(testUser));

        // Act
        authenticationService.resendVerificationEmail(testUser.getEmail());

        // Assert
        verify(userRepository).findByEmail(testUser.getEmail());
        verify(emailSender).sendVerificationEmail(eq(testUser.getUsername()), eq(testUser.getEmail()), anyString());
        verify(codeCacheService).saveVerificationCode(anyString(), eq(testUser.getId()));
    }

    @Test
    void testResendVerificationEmail_WithNonExistentEmail_ShouldThrowException() {
        // Arrange
        String nonExistentEmail = "nonexistent@example.com";
        when(userRepository.findByEmail(nonExistentEmail))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.resendVerificationEmail(nonExistentEmail);
        });

        verify(userRepository).findByEmail(nonExistentEmail);
        verify(emailSender, never()).sendVerificationEmail(anyString(), anyString(), anyString());
        verify(codeCacheService, never()).saveVerificationCode(anyString(), any());
    }

    @Test
    void testResendVerificationEmail_WithAlreadyVerifiedAccount_ShouldThrowException() {
        // Arrange
        testUser.setVerified(true);
        when(userRepository.findByEmail(testUser.getEmail()))
                .thenReturn(Optional.of(testUser));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            authenticationService.resendVerificationEmail(testUser.getEmail());
        });

        verify(userRepository).findByEmail(testUser.getEmail());
        verify(emailSender, never()).sendVerificationEmail(anyString(), anyString(), anyString());
        verify(codeCacheService, never()).saveVerificationCode(anyString(), any());
    }
}
