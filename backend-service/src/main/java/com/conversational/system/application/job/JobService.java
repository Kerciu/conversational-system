package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class JobService {

    private final RabbitTemplate rabbitTemplate;
    private final Map<String, Map<String, String>> jobResults = new ConcurrentHashMap<>();

    @Value("${app.queue.code.request}")
    private String requestQueueName;

    public void submitJob(JobDescriptionDto jobDescriptionDto) {
        Map<String, String> message = Map.of(
                "jobId", jobDescriptionDto.getJobId(),
                "agentType", jobDescriptionDto.getAgentType(),
                "prompt", jobDescriptionDto.getPrompt()
        );

        // Store initial status
        jobResults.put(jobDescriptionDto.getJobId(), Map.of("status", "pending"));

        rabbitTemplate.convertAndSend(requestQueueName, message);
        System.out.println("Job " + jobDescriptionDto.getJobId() + " submitted with agent type: " + jobDescriptionDto.getAgentType());
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
