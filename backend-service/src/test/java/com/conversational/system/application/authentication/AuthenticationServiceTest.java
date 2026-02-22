package com.conversational.system.application.authentication;

import com.conversational.system.application.authentication.email_sender.EmailSender;
import com.conversational.system.application.authentication.json_web_token.JwtService;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

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

    @BeforeEach
    void setUp() {
        testUser = new User("test@example.com", "testuser", "hashedPassword");
        testUser.setId(1);
    }

    @Test
    void authenticateOAuth2User_ShouldSucceed_WhenUserExists() {
        OAuth2AuthenticationToken token = mock(OAuth2AuthenticationToken.class);
        OAuth2User oAuth2User = mock(OAuth2User.class);
        when(token.getPrincipal()).thenReturn(oAuth2User);
        when(token.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(token.getName()).thenReturn("someName");

        when(oauth2Service.extractEmail(any(), anyString(), anyString())).thenReturn("test@example.com");
        when(oauth2Service.extractUsername(any(), anyString())).thenReturn("testuser");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateJWToken("testuser")).thenReturn("mock-jwt-token");

        String result = authenticationService.authenticateOAuth2User(token);

        assertThat(result).isEqualTo("mock-jwt-token");
    }

    @Test
    void authenticateOAuth2User_ShouldCreateUser_WhenUserDoesNotExist() {
        OAuth2AuthenticationToken token = mock(OAuth2AuthenticationToken.class);
        OAuth2User oAuth2User = mock(OAuth2User.class);
        when(token.getPrincipal()).thenReturn(oAuth2User);
        when(token.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(token.getName()).thenReturn("someName");

        when(oauth2Service.extractEmail(any(), anyString(), anyString())).thenReturn("new@example.com");
        when(oauth2Service.extractUsername(any(), anyString())).thenReturn("newuser");
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateJWToken(anyString())).thenReturn("mock-jwt-token");

        String result = authenticationService.authenticateOAuth2User(token);

        assertThat(result).isEqualTo("mock-jwt-token");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void authenticateOAuth2User_ShouldThrowException_WhenNotOAuth2Token() {
        Authentication auth = mock(Authentication.class);
        assertThatThrownBy(() -> authenticationService.authenticateOAuth2User(auth))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Expected OAuth2AuthenticationToken");
    }

    @Test
    void extractUser_ShouldReturnUser_WhenAuthenticated() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        User result = authenticationService.extractUser(auth);

        assertThat(result).isEqualTo(testUser);
    }

    @Test
    void extractUser_ShouldThrowException_WhenUserNotFound() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("unknown");
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authenticationService.extractUser(auth))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Authenticated user not found");
    }

    @Test
    void verifyEmail_ShouldThrowException_WhenInvalidEmail() {
        assertThatThrownBy(() -> authenticationService.verifyEmail("invalid-email"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Provided email address");
    }

    @Test
    void verifyEmail_ShouldNotThrow_WhenValidEmail() {
        authenticationService.verifyEmail("valid@example.com");
    }

    @Test
    void verifyEmailUnique_ShouldThrow_WhenEmailExists() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        assertThatThrownBy(() -> authenticationService.verifyEmailUnique("test@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already taken");
    }

    @Test
    void verifyUsernameUnique_ShouldThrow_WhenUsernameExists() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        assertThatThrownBy(() -> authenticationService.verifyUsernameUnique("testuser"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already taken");
    }

    @Test
    void resetPassword_ShouldThrow_WhenCodeInvalid() {
        when(codeCacheService.getUserIdByPasswordResetCode("invalid")).thenReturn(null);
        assertThatThrownBy(() -> authenticationService.resetPassword("invalid", "newPass"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid password reset code");
    }

    @Test
    void resendVerificationEmail_ShouldThrow_WhenAlreadyVerified() {
        testUser.setVerified(true);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        assertThatThrownBy(() -> authenticationService.resendVerificationEmail("test@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Account is already verified");
    }
}
