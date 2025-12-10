package com.conversational.system.application.controllers;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.security.core.Authentication;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.controllers.requests.LoginRequest;
import com.conversational.system.application.controllers.requests.RegisterRequest;
import com.conversational.system.application.controllers.requests.ResetPasswordRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@RequestBody RegisterRequest request) {
        try {
            authenticationService.registerUser(request.getUsername(), request.getEmail(), request.getPassword());
            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Exception occured during registration process.\n" + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<String> loginUser(@RequestBody LoginRequest request) {
        try {
            String token = authenticationService.loginUser(request.getUsername(), request.getPassword());
            return ResponseEntity.status(HttpStatus.OK).body(token);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Exception occured during registration process.\n" + e.getMessage());
        }
    }

    @GetMapping("/oauth2/success")
    public void authenticateWithGoogle(Authentication authentication, HttpServletResponse response) throws IOException {
        try {
            String token = authenticationService.authenticateOAuth2User(authentication);
            response.sendRedirect("http://localhost:3000/auth/callback?token=" + token);
        } catch (Exception e) {
            response.sendRedirect("http://localhost:3000/auth/login?error=OAuthAuthenticationFailed");
        }
    }

    @PostMapping("/veirfy-account")
    public ResponseEntity<String> verifyAccount(@RequestBody String verificationCode) {
        try {
            authenticationService.verifyAccount(verificationCode);
            return ResponseEntity.status(HttpStatus.OK).body("Account has been verified successfully");
        }
        catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during email verification process.\n" +e.getMessage());
        }
    }

    @PostMapping("/reset-password-request")
    public ResponseEntity<String> resetPasswordRequest(@RequestBody String email) {
        try{
            authenticationService.resetPasswordRequest(email);
            return ResponseEntity.status(HttpStatus.OK).body("Password reset email sent successfully");
        } catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during password reset process.\n" +e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authenticationService.resetPassword(request.getResetCode(), request.getNewPassword());
            return ResponseEntity.status(HttpStatus.OK).body("Password has been reset successfully");
        }
        catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during password reset process.\n" + e.getMessage());
        }
    }
}