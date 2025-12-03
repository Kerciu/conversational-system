package com.conversational.system.application.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.conversational.system.application.authentication.AuthenticationService;

import lombok.RequiredArgsConstructor;


@RestController
@RequiredArgsConstructor 
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final AuthenticationService authenticationService;

    @GetMapping("/get-email")
    public ResponseEntity<String> getUserEmail(Authentication authentication){
        try {
            return ResponseEntity.status(HttpStatus.OK).body(authenticationService.extractUser(authentication).getEmail());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" +e.getMessage());
        }
    }
    
    @GetMapping("/get-username")
    public ResponseEntity<String> getUserUsername(Authentication authentication){
        try {
            return ResponseEntity.status(HttpStatus.OK).body(authenticationService.extractUser(authentication).getUsername());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" +e.getMessage());
        }
    }
}
