package com.conversational.system.application.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.controllers.requests.UpdateConversationTitleRequest;
import com.conversational.system.application.controllers.responses.ConversationDisplayResponse;
import com.conversational.system.application.controllers.responses.MessageDisplayResponse;
import com.conversational.system.application.entities.conversation.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final AuthenticationService authenticationService;
    private final ConversationService conversationService;

    @GetMapping("/get-email")
    public ResponseEntity<String> getUserEmail(Authentication authentication) {
        try {
            return ResponseEntity.status(HttpStatus.OK).body(authenticationService.extractUser(authentication).getEmail());
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" + e.getMessage());
        }
    }

    @GetMapping("/get-username")
    public ResponseEntity<String> getUserUsername(Authentication authentication) {
        try {
            return ResponseEntity.status(HttpStatus.OK).body(authenticationService.extractUser(authentication).getUsername());
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error getting user email.\n" + e.getMessage());
        }
    }

    @GetMapping("/get-conversation-list")
    public ResponseEntity<List<ConversationDisplayResponse>> getUsersConversations(Authentication authentication) {
        try {
            Integer userId = authenticationService.extractUser(authentication).getId();
            return ResponseEntity.status(HttpStatus.OK).body(conversationService.getUsersConversations(userId));
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/get-conversation-history/{conversationId}")
    public ResponseEntity<List<MessageDisplayResponse>> getConversationHistory(Authentication authentication, @PathVariable Integer conversationId) {
        try {
            Integer userId = authenticationService.extractUser(authentication).getId();
            return ResponseEntity.status(HttpStatus.OK).body(conversationService.getConversationHistory(userId, conversationId));
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/new-conversation")
    public ResponseEntity<Integer> startNewConversation(Authentication authentication) {
        try {
            User user = authenticationService.extractUser(authentication);
            return ResponseEntity.status(HttpStatus.OK).body(conversationService.newConversation(user, "Title"));
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @DeleteMapping("/delete-conversation/{conversationId}")
    public ResponseEntity<?> deleteConversation(Authentication authentication, @PathVariable Integer conversationId) {
        try {
            Integer userId = authenticationService.extractUser(authentication).getId();
            conversationService.deleteConversation(userId, conversationId);
            return ResponseEntity.status(HttpStatus.OK).build();
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PutMapping("/rename-conversation")
    public ResponseEntity<?> renameConversation(Authentication authentication, @RequestBody UpdateConversationTitleRequest request) {
        try {
            Integer userId = authenticationService.extractUser(authentication).getId();
            conversationService.renameConversation(userId, request.getConversationId(), request.getTitle());
            return ResponseEntity.status(HttpStatus.OK).build();
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}
