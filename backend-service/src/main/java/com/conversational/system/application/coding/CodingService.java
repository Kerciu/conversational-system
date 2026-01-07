package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CodingService {

    private final RabbitTemplate rabbitTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.queue.code.execution}")
    private String codeExecutionQueue;

    @Value("${app.queue.ai.tasks:ai_tasks_queue}")
    private String aiTasksQueue;

    public String submitJobWithFiles(
            String agentType,
            String prompt,
            String conversationId,
            String acceptedModelId,
            String acceptedCodeId,
            MultipartFile[] files
    ) throws IOException {

        String jobId = UUID.randomUUID().toString();

        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("jobId", jobId);
        messageMap.put("agentType", agentType);
        messageMap.put("prompt", prompt);
        messageMap.put("conversationId", conversationId);
        
        if (acceptedModelId != null) messageMap.put("acceptedModel", acceptedModelId);
        if (acceptedCodeId != null) messageMap.put("acceptedCode", acceptedCodeId);

        messageMap.put("conversationHistory", new ArrayList<>()); 

        List<Map<String, String>> filesPayload = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    Map<String, String> fileData = new HashMap<>();
                    fileData.put("name", file.getOriginalFilename());
                    
                    String base64Content = Base64.getEncoder().encodeToString(file.getBytes());
                    fileData.put("content", base64Content);
                    
                    filesPayload.add(fileData);
                }
            }
        }
        messageMap.put("files", filesPayload);

        rabbitTemplate.convertAndSend(aiTasksQueue, messageMap);
        
        System.out.println("Job " + jobId + " sent to Agent Queue (" + aiTasksQueue + ") with " + filesPayload.size() + " files.");

        return jobId;
    }

    public Map<String, String> executeCode(String code) {
        String jobId = UUID.randomUUID().toString();

        Map<String, String> message = Map.of(
                "jobId", jobId,
                "taskType", "coding",
                "code", code
        );

        rabbitTemplate.convertAndSend(codeExecutionQueue, message);

        System.out.println("Job submitted to sandbox with jobId #" + jobId);
        return Map.of("jobId", jobId);
    }

    public Object getCodeExecutionResult(String jobId) {
        return redisTemplate.opsForValue().get(jobId);
    }
}