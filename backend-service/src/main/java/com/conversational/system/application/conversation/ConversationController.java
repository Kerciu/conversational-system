package com.conversational.system.application.conversation;

import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUserConversations(
            @AuthenticationPrincipal User user) {
        
        List<Conversation> conversations = conversationService.getUserConversations(user);
        
        List<Map<String, Object>> result = conversations.stream()
            .map(conv -> Map.of(
                "id", (Object) conv.getId().toString(),
                "title", conv.getTitle(),
                "createdAt", conv.getCreatedAt().toString(),
                "updatedAt", conv.getUpdatedAt().toString()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{conversationId}/history/{agentType}")
    public ResponseEntity<Map<String, Object>> getConversationHistory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID conversationId,
            @PathVariable String agentType) {
        
        Optional<Conversation> conversation = conversationService.getConversation(conversationId);
        
        if (conversation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Check if user owns this conversation
        if (!conversation.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        
        List<Map<String, Object>> history = conversationService.getConversationHistory(conversationId, agentType);
        
        return ResponseEntity.ok(Map.of(
            "conversationId", conversationId.toString(),
            "agentType", agentType,
            "messages", history
        ));
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @AuthenticationPrincipal User user,
            @PathVariable UUID conversationId) {
        
        Optional<Conversation> conversation = conversationService.getConversation(conversationId);
        
        if (conversation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Check if user owns this conversation
        if (!conversation.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        
        conversationService.deleteConversation(conversationId);
        
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
