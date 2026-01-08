package com.conversational.system.application.coding;

import com.conversational.system.application.conversation.ConversationService;
import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.conversation.Message;
import com.conversational.system.application.entities.conversation.repositories.MessageRepository;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CodingService {

    private final RabbitTemplate rabbitTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    private final ConversationService conversationService;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    @Value("${app.queue.code.execution}")
    private String codeExecutionQueue;

    @Value("${app.queue.ai.tasks:ai_tasks_queue}")
    private String aiTasksQueue;

    public record JobSubmissionResult(String jobId, String conversationId) {}

    @Transactional
    public JobSubmissionResult submitJobWithFiles(
            String agentType,
            String prompt,
            String conversationIdStr,
            String acceptedModelId,
            String acceptedCodeId,
            MultipartFile[] files
    ) throws IOException {

        String jobId = UUID.randomUUID().toString();
        UUID conversationId;

        System.out.println("--- DEBUG SUBMIT JOB ---");
        String authName = SecurityContextHolder.getContext().getAuthentication().getName();
        System.out.println("User from Token: " + authName);

        if (conversationIdStr == null || conversationIdStr.isEmpty() || conversationIdStr.equals("undefined") || conversationIdStr.equals("null")) {
            
            User currentUser = userRepository.findByEmail(authName)
                    .or(() -> userRepository.findByUsername(authName))
                    .orElseThrow(() -> new RuntimeException("Authenticated user [" + authName + "] not found in database. Please register/login again."));

            System.out.println("Found User ID: " + currentUser.getId());

            String title = (prompt != null && prompt.length() > 50)
                    ? prompt.substring(0, 50) + "..."
                    : (prompt != null ? prompt : "New Conversation");

            Conversation newConv = conversationService.createConversation(currentUser, title);
            conversationId = newConv.getId();
            System.out.println("Created New Conversation: " + conversationId);
        } else {
            conversationId = UUID.fromString(conversationIdStr);
            System.out.println("Using Existing Conversation: " + conversationId);
        }

        String dbContent = prompt != null ? prompt : "";
        if (files != null && files.length > 0) {
            StringBuilder fileNames = new StringBuilder();
            for (MultipartFile f : files) {
                if (fileNames.length() > 0) fileNames.append(", ");
                fileNames.append(f.getOriginalFilename());
            }
            if (dbContent.trim().isEmpty()) {
                dbContent = "[Sent files: " + fileNames.toString() + "]";
            } else {
                dbContent += "\n\n[Attached: " + fileNames.toString() + "]";
            }
        }

        conversationService.saveUserMessage(conversationId, agentType, dbContent, jobId);

        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("jobId", jobId);
        messageMap.put("agentType", agentType);
        messageMap.put("prompt", prompt != null ? prompt : "");
        messageMap.put("conversationId", conversationId.toString());
        
        if (acceptedModelId != null) messageMap.put("acceptedModel", acceptedModelId);
        if (acceptedCodeId != null) messageMap.put("acceptedCode", acceptedCodeId);

        try {
             messageMap.put("conversationHistory", conversationService.getConversationHistory(conversationId, agentType));
        } catch (Exception e) {
             messageMap.put("conversationHistory", new ArrayList<>());
        }

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
        System.out.println("Job submitted successfully: " + jobId);

        return new JobSubmissionResult(jobId, conversationId.toString());
    }

    public Object getCodeExecutionResult(String jobId) {
        Object redisResult = redisTemplate.opsForValue().get(jobId);
        if (redisResult != null) {
            return redisResult;
        }

        System.out.println("DEBUG: Polling DB for JobID: " + jobId);
        
        List<Message> messages = messageRepository.findAllByJobId(jobId);
        
        Optional<Message> assistantMsg = messages.stream()
                .filter(m -> "assistant".equalsIgnoreCase(m.getRole()))
                .findFirst();

        if (assistantMsg.isPresent()) {
            System.out.println("DEBUG: Found Assistant Message in DB! ID: " + assistantMsg.get().getId());
            Message msg = assistantMsg.get();
            return Map.of(
                "status", "TASK_COMPLETED",
                "answer", msg.getContent(),
                "messageId", msg.getId().toString(),
                "jobId", jobId
            );
        }

        return null;
    }

    public Map<String, String> executeCode(String code) {
        String jobId = UUID.randomUUID().toString();
        Map<String, String> message = Map.of("jobId", jobId, "taskType", "coding", "code", code);
        rabbitTemplate.convertAndSend(codeExecutionQueue, message);
        return Map.of("jobId", jobId);
    }
}