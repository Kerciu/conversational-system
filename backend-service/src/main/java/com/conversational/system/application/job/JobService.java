package com.conversational.system.application.job;

import com.conversational.system.application.conversation.ConversationService;
import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class JobService {

    private final RabbitTemplate rabbitTemplate;
    private final ConversationService conversationService;
    private final Map<String, Map<String, String>> jobResults = new ConcurrentHashMap<>();
    private final Map<String, UUID> jobToConversationMap = new ConcurrentHashMap<>();

    @Value("${app.queue.code.request}")
    private String requestQueueName;

    public UUID submitJob(JobDescriptionDto jobDescriptionDto, User user) {
        if (user == null) {
            throw new IllegalArgumentException("Authenticated user is required to submit a job");
        }

        UUID conversationId = jobDescriptionDto.getConversationId();
        
        // If no conversationId provided, create a new conversation
        if (conversationId == null) {
            Conversation newConversation = conversationService.createConversation(
                user, 
                jobDescriptionDto.getPrompt().substring(0, Math.min(20, jobDescriptionDto.getPrompt().length())) //TODO improve title
            );
            conversationId = newConversation.getId();
            System.out.println("Created new conversation: " + conversationId);
        }
        
        jobToConversationMap.put(jobDescriptionDto.getJobId(), conversationId);
        
        conversationService.saveUserMessage(
            conversationId,
            jobDescriptionDto.getAgentType(),
            jobDescriptionDto.getPrompt(),
            jobDescriptionDto.getJobId()
        );
        
        List<Map<String, Object>> conversationHistory = conversationService.getConversationHistory(
            conversationId,
            jobDescriptionDto.getAgentType()
        );

        Map<String, Object> message = new HashMap<>();
        message.put("jobId", jobDescriptionDto.getJobId());
        message.put("agentType", jobDescriptionDto.getAgentType());
        message.put("prompt", jobDescriptionDto.getPrompt());
        message.put("conversationHistory", conversationHistory);

        // Store initial status
        jobResults.put(jobDescriptionDto.getJobId(), Map.of("status", "pending"));

        rabbitTemplate.convertAndSend(requestQueueName, message);
        System.out.println("Job " + jobDescriptionDto.getJobId() + " submitted with agent type: " + jobDescriptionDto.getAgentType());
        System.out.println("Conversation ID: " + conversationId);
        System.out.println("Conversation history size: " + conversationHistory.size());
        
        return conversationId;
    }

    public Map<String, String> getJobStatus(String jobId) {
        Map<String, String> result = jobResults.get(jobId);
        if (result == null) {
            return Map.of("status", "not_found", "message", "Job not found");
        }
        return result;
    }

    public void updateJobResult(String jobId, String status, String answer) {
        Map<String, String> result = new HashMap<>();
        result.put("status", status);
        if (answer != null) {
            result.put("answer", answer);
        }
        jobResults.put(jobId, result);
    }
}
