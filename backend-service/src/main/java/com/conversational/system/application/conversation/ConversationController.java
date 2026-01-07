package com.conversational.system.application.conversation;

import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import com.conversational.system.application.job.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final UserRepository userRepository;
    private final JobService jobService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUserConversations(
            @AuthenticationPrincipal UserDetails principal) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // Fetch the managed User entity from the database
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseGet(() -> userRepository.findByUsername(principal.getUsername())
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        List<Conversation> conversations = conversationService.getUserConversations(user);

        List<Map<String, Object>> result = conversations.stream()
                .map(conv -> Map.of(
                        "id", (Object) conv.getId().toString(),
                        "title", conv.getTitle(),
                        "createdAt", conv.getCreatedAt().toString(),
                        "updatedAt", conv.getUpdatedAt().toString()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{conversationId}/history/{agentType}")
    public ResponseEntity<Map<String, Object>> getConversationHistory(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID conversationId,
            @PathVariable String agentType) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // Fetch the managed User entity from the database
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseGet(() -> userRepository.findByUsername(principal.getUsername())
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

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
                "messages", history));
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID conversationId) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // Fetch the managed User entity from the database
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseGet(() -> userRepository.findByUsername(principal.getUsername())
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

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

    @GetMapping("/{conversationId}/status")
    public ResponseEntity<Map<String, Object>> getConversationStatus(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable UUID conversationId) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // Fetch the managed User entity from the database
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseGet(() -> userRepository.findByUsername(principal.getUsername())
                        .orElse(null));

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Optional<Conversation> conversation = conversationService.getConversation(conversationId);

        if (conversation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Check if user owns this conversation
        if (!conversation.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        boolean isLoading = jobService.hasActiveJob(conversationId);
        String jobId = isLoading ? jobService.getActiveJobId(conversationId) : null;
        boolean hadError = !isLoading && jobService.hasLastError(conversationId);

        Map<String, Object> resp = new HashMap<>();
        resp.put("conversationId", conversationId.toString());
        resp.put("isLoading", isLoading);
        resp.put("hadError", hadError);
        if (jobId != null) {
            resp.put("jobId", jobId);
        }
        return ResponseEntity.ok(resp);
    }
}
