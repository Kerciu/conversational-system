package com.conversational.system.application.authentication;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
public class RegistrationTests {
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    // Additional constructor dependencies of AuthenticationService:
    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private OAuth2Service oauth2Service;

    // Ensure EmailSender is mocked so it's injected and not null
    @Mock
    private EmailSender emailSender;

    @InjectMocks
    private AuthenticationService authenticationService;


    @Test
    void testRegisteringAndSavingWithValidData() {
        // CREATE AND SAVE USER
        String username = "newuser";
        String email = "newuser@example.com";
        String password = "password123";
        String encodedPassword = "encoded-password";

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(password)).thenReturn(encodedPassword);
        doNothing().when(emailSender).sendVerificationEmail(any(User.class));

        authenticationService.registerUser(username, email, password);

        // CHECK IF USER WAS SAVED WITH CORRECT DATA
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(2)).save(userCaptor.capture());
        verify(emailSender).sendVerificationEmail(any(User.class));

        User savedUser = userCaptor.getValue();
        assertEquals(username, savedUser.getUsername());
        assertEquals(email, savedUser.getEmail());
        assertEquals(encodedPassword, savedUser.getPasswordHash());        
    }

    @Test
    void shouldThrowException_WhenEmailAlreadyExists() {
        String email = "existing@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(new User()));

        // MAKE SURE EXCEPTION IS THROWN & USER WAS NOT SAVED 
        assertThrows(RuntimeException.class, () -> {
            authenticationService.registerUser("user", email, "password");
        });
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldThrowException_WhenUsernameAlreadyExists() {
        String username = "existinguser";
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(new User()));

        // MAKE SURE EXCEPTION IS THROWN & USER WAS NOT SAVED 
        assertThrows(RuntimeException.class, () -> { // lub stwórz UsernameAlreadyExistsException
            authenticationService.registerUser(username, "new@test.com", "password");
        });
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldThrowException_WhenEmailIsInvalid() {
        String invalidEmail = "not-an-email";

        // MAKE SURE EXCEPTION IS THROWN & USER WAS NOT SAVED 
        assertThrows(RuntimeException.class, () -> {
            authenticationService.registerUser("user", invalidEmail, "password");
        });
        verify(userRepository, never()).save(any(User.class));
    }

}