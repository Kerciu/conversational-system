package com.conversational.system.application.authentication;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.authentication.json_web_token.JwtService;

@ExtendWith(MockitoExtension.class)
public class LoginTests {
    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private Authentication authenticatedAuth; // Mock authenticated Authentication object

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void shouldThrowException_WhenAccountIsDisabled() {
        // MOCK AUTHENTICATION MANAGER THROWING DISABLED EXCEPTION
        String username = "disabled-user";
        String password = "password";
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new DisabledException("Account disabled"));

        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            authenticationService.loginUser(username, password);
        });

        // MAKE SURE TOKEN WAS NOT GENERATED
        assertTrue(thrown.getMessage().contains("Account is not verified"));
        assertTrue(thrown.getMessage().contains(username));
        verify(jwtService, never()).generateJWToken(anyString());
    }

    @Test
    void shouldThrowException_WhenCredentialsAreInvalid() {
        //  MOCK AUTHENTICATION MANAGER THROWING BAD CREDENTIALS EXCEPTION
        String username = "user";
        String password = "wrong-password";

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            authenticationService.loginUser(username, password);
        });

        // MAKE SURE TOKEN WAS NOT GENERATED & ERROR MESSAGE IS CORRECT
        assertTrue(thrown.getMessage().contains("Authentication failed"));
        assertTrue(thrown.getMessage().contains(username));
        verify(jwtService, never()).generateJWToken(anyString());
    }

    @Test
    void shouldThrowException_WhenUserNotFound() {
        // MOCK AUTHENTICATION MANAGER THROWING USERNAME NOT FOUND EXCEPTION
        String username = "non-existent-user";
        String password = "password";

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("User not found"));

        RuntimeException thrown = assertThrows(RuntimeException.class, () -> {
            authenticationService.loginUser(username, password);
        });

        // MAKE SURE TOKEN WAS NOT GENERATED & ERROR MESSAGE IS CORRECT
        assertTrue(thrown.getMessage().contains("Authentication failed"));
        assertTrue(thrown.getMessage().contains(username));
        verify(jwtService, never()).generateJWToken(anyString());
    }

    @Test
    void shouldThrowException_WhenUsernameIsNull() {
        // MOCK NULL USERNAME INPUT 
        assertThrows(Exception.class, () -> {
            authenticationService.loginUser(null, "password");
        });

        // MAKE SURE TOKEN WAS NOT GENERATED & NO AUTHENTICATION ATTEMPT WAS MADE
        verify(authenticationManager, never()).authenticate(any());
        verify(jwtService, never()).generateJWToken(anyString());
    }
}
