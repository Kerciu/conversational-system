package com.conversational.system.application.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.conversational.system.application.security.AuthenticationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class Oauth2Controller {
    private final AuthenticationService authenticationService;
    
        @PostMapping("/login/oauth2/code/google")
    public ResponseEntity<String> authenticateWithGoogle(Authentication authentication) {
        try{
            String token = authenticationService.authenticateOAuth2User(authentication);
            return ResponseEntity.status(HttpStatus.OK).body(token);
        }
        catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during Google authentication process.\n" +e.getMessage());
        }
    }
}
