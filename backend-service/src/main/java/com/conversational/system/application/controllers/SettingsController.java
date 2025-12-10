package com.conversational.system.application.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.authentication.json_web_token.JwtService;
import com.conversational.system.application.controllers.requests.ChangeEmailRequest;
import com.conversational.system.application.controllers.requests.ChangePasswordRequest;
import com.conversational.system.application.controllers.requests.ChangeUsernameRequest;
import com.conversational.system.application.dto.UserProfileDto;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserService;

import lombok.RequiredArgsConstructor;



@RestController
@RequiredArgsConstructor
@RequestMapping("/api/settings")
public class SettingsController {
    private final AuthenticationService authenticationService;
    private final UserService userService;
    private final JwtService jwtService;
    
    @GetMapping("/profile")
    public ResponseEntity<UserProfileDto> getUserProfile(Authentication authentication) {
        try {
            var user = authenticationService.extractUser(authentication);
            
            UserProfileDto profile = UserProfileDto.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .isVerified(user.isVerified())
                .createdAt(user.getCreationDate().toString())
                .build();

            return ResponseEntity.ok(profile);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/get-is-verified")
    public ResponseEntity<String> getUserUsername(Authentication authentication){
        try {
            String verificationState = "unverified";
            if (authenticationService.extractUser(authentication).isVerified()) verificationState="verified";
            return ResponseEntity.status(HttpStatus.OK).body(verificationState);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" +e.getMessage());
        }
    }

    @GetMapping("/get-creation-date")
    public ResponseEntity<String> getCreationDate(Authentication authentication){
        try {
            return ResponseEntity.status(HttpStatus.OK).body(authenticationService.extractUser(authentication).getCreationDate().toString());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" +e.getMessage());
        }
    }

    @PostMapping("/change-username")
    public ResponseEntity<String> changeUsername(Authentication authentication, @RequestBody ChangeUsernameRequest request) {
        try {
            User user = authenticationService.extractUser(authentication);
            userService.changeUsername(user, request.getNewUsername());
            String token = jwtService.generateJWToken(request.getNewUsername());
            return ResponseEntity.status(HttpStatus.OK).body(token);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error occured while changing username.\n" +e.getMessage());
        }
    }

    @PutMapping("/change-email")
    public ResponseEntity<String> changeEmail(Authentication authentication, @RequestBody ChangeEmailRequest request) {
        try {
            userService.changeEmail(authenticationService.extractUser(authentication), request.getNewEmail());
            return ResponseEntity.status(HttpStatus.OK).body("Email changed to "+request.getNewEmail());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error occured while changing email.\n" +e.getMessage());
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(Authentication authentication, @RequestBody ChangePasswordRequest request) {
        try {
            userService.changePassword(authenticationService.extractUser(authentication), request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.status(HttpStatus.OK).body("Password changed.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error occured while changing email.\n" +e.getMessage());
        }
    }
    
    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteUser(Authentication authentication){
        try {
            userService.deleteUser(authenticationService.extractUser(authentication));
            return ResponseEntity.status(HttpStatus.OK).body("Accuont deletedd");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error occured during account deletion.\n" +e.getMessage());
        }
    }
}
