package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.conversational.system.application.entities.conversation.ConversationService;
import com.conversational.system.application.entities.user.User;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final RabbitTemplate rabbitTemplate;
    private final ConversationService conversationService;
    private final Map<String, Map<String, String>> jobResults = new ConcurrentHashMap<>();

    @Value("${app.queue.code.request}")
    private String requestQueueName;

    public void submitJob(User user, JobDescriptionDto jobDescriptionDto) {
        String messageContent = jobDescriptionDto.getUserMessage();
        if (messageContent == null || messageContent.isEmpty()) {
            messageContent = jobDescriptionDto.getPrompt();
        }
        conversationService.saveUserMessage(jobDescriptionDto.getConversationId(), user.getId(), messageContent);

        Map<String, String> message = Map.of(
                "jobId", jobDescriptionDto.getJobId(),
                "agentType", jobDescriptionDto.getAgentType(),
                "prompt", jobDescriptionDto.getPrompt());

        // Store initial status
        if (jobDescriptionDto.getConversationId() == null)
            throw new IllegalArgumentException("Conversation ID cannot be null");

        Map<String, String> initialData = new HashMap<>();
        initialData.put("status", "pending");
        initialData.put("conversationId", String.valueOf(jobDescriptionDto.getConversationId()));
        jobResults.put(jobDescriptionDto.getJobId(), initialData);

        rabbitTemplate.convertAndSend(requestQueueName, message);
        System.out.println("Job " + jobDescriptionDto.getJobId() + " submitted with agent type: "
                + jobDescriptionDto.getAgentType());
    }

    public Map<String, String> getJobStatus(String jobId) {
        Map<String, String> result = jobResults.get(jobId);
        if (result == null) {
            return Map.of("status", "not_found", "message", "Job not found");
        }
        return result;
    }

    public void updateJobResult(String jobId, String status, String answer) {
        Map<String, String> result = jobResults.computeIfAbsent(jobId, k -> new HashMap<>());
        result.put("status", status);
        if (answer != null) {
            result.put("answer", answer);
        }
        // No need to put back as we modified the map in place or the one returned by
        // computeIfAbsent
    }
}
