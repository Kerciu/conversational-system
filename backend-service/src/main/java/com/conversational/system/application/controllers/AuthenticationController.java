package com.conversational.system.application.controllers;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.controllers.requests.LoginRequest;
import com.conversational.system.application.controllers.requests.RegisterRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor 
@RequestMapping("/api/auth")
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@RequestBody RegisterRequest request) { 
        try{
            authenticationService.registerUser(request.getUsername(), request.getEmail(),  request.getPassword());
            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
        } catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during registration process.\n" +e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<String> loginUser(@RequestBody LoginRequest request) {
        try{
            String token = authenticationService.loginUser(request.getUsername(), request.getPassword());
            return ResponseEntity.status(HttpStatus.OK).body(token);
        } catch(Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Exception occured during registration process.\n" +e.getMessage());
        }
    }

}