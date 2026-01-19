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
    private final Map<UUID, String> conversationToActiveJobMap = new ConcurrentHashMap<>();
    private final Map<UUID, String> conversationToLastTerminalStatus = new ConcurrentHashMap<>();

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
                    jobDescriptionDto.getPrompt().substring(0, Math.min(20, jobDescriptionDto.getPrompt().length())));
            conversationId = newConversation.getId();
            System.out.println("Created new conversation: " + conversationId);
        }

        jobToConversationMap.put(jobDescriptionDto.getJobId(), conversationId);
        conversationToActiveJobMap.put(conversationId, jobDescriptionDto.getJobId());
        // New job starts: clear last terminal status
        conversationToLastTerminalStatus.remove(conversationId);

        conversationService.saveUserMessage(
                conversationId,
                jobDescriptionDto.getAgentType(),
                jobDescriptionDto.getPrompt(),
                jobDescriptionDto.getJobId());

        List<Map<String, Object>> conversationHistory = conversationService.getConversationHistory(
                conversationId,
                jobDescriptionDto.getAgentType());

        Map<String, Object> message = new HashMap<>();
        message.put("jobId", jobDescriptionDto.getJobId());
        message.put("agentType", jobDescriptionDto.getAgentType());
        message.put("prompt", jobDescriptionDto.getPrompt());
        message.put("conversationHistory", conversationHistory);

        if (jobDescriptionDto.getFiles() != null && !jobDescriptionDto.getFiles().isEmpty()) {
            List<Map<String, String>> filesPayload = jobDescriptionDto.getFiles().stream()
                    .map(file -> {
                        Map<String, String> fileMap = new HashMap<>();
                        fileMap.put("name", file.getName());
                        fileMap.put("content_base64", file.getContentBase64());
                        return fileMap;
                    })
                    .collect(java.util.stream.Collectors.toList());

            message.put("files", filesPayload);
            System.out.println("Attached " + filesPayload.size() + " files to job " + jobDescriptionDto.getJobId());
        }

        String acceptedModel = jobDescriptionDto.getAcceptedModel();
        if (acceptedModel == null && jobDescriptionDto.getAcceptedModelMessageId() != null) {
            acceptedModel = conversationService.getMessageContent(jobDescriptionDto.getAcceptedModelMessageId());
        }
        if (acceptedModel != null) {
            message.put("acceptedModel", acceptedModel);
        }

        String acceptedCode = jobDescriptionDto.getAcceptedCode();
        if (acceptedCode == null && jobDescriptionDto.getAcceptedCodeMessageId() != null) {
            acceptedCode = conversationService.getMessageContent(jobDescriptionDto.getAcceptedCodeMessageId());
        }
        if (acceptedCode != null) {
            message.put("acceptedCode", acceptedCode);
        }

        // Store initial status
        jobResults.put(jobDescriptionDto.getJobId(), Map.of("status", "pending"));

        rabbitTemplate.convertAndSend(requestQueueName, message);
        System.out.println("Job " + jobDescriptionDto.getJobId() + " submitted with agent type: "
                + jobDescriptionDto.getAgentType());
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
        updateJobResult(jobId, status, answer, null);
    }

    public void updateJobResult(String jobId, String status, String answer, String messageId) {
        Map<String, String> result = new HashMap<>();
        result.put("status", status);
        if (answer != null) {
            result.put("answer", answer);
        }
        if (messageId != null) {
            result.put("messageId", messageId);
        }
        jobResults.put(jobId, result);

        // Remove from active jobs when terminal (completed or error/failed)
        if ("completed".equals(status) || "failed".equals(status) || "error".equals(status)) {
            UUID conversationId = jobToConversationMap.get(jobId);
            if (conversationId != null) {
                conversationToActiveJobMap.remove(conversationId);
                // Record last terminal status for the conversation
                conversationToLastTerminalStatus.put(conversationId, status);
            }
        }
    }

    public boolean hasActiveJob(UUID conversationId) {
        String activeJobId = conversationToActiveJobMap.get(conversationId);
        if (activeJobId == null) {
            return false;
        }

        // Check if job is still pending
        Map<String, String> jobStatus = jobResults.get(activeJobId);
        if (jobStatus == null) {
            return false;
        }

        String status = jobStatus.get("status");
        return "pending".equals(status);
    }

    public String getActiveJobId(UUID conversationId) {
        return conversationToActiveJobMap.get(conversationId);
    }

    public boolean hasLastError(UUID conversationId) {
        String last = conversationToLastTerminalStatus.get(conversationId);
        return "failed".equals(last) || "error".equals(last);
    }
}
