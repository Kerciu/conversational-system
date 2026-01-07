package com.conversational.system.application.config;

import com.conversational.system.application.entities.conversation.ConversationService;
import com.conversational.system.application.job.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class ResultsListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final JobService jobService;
    private final ConversationService conversationService;

    @RabbitListener(queues = "${app.queue.code.review}")
    public void receiveJobResults(Map<String, Object> resultMessage) {
        String jobId = (String) resultMessage.get("jobId");
        String status = (String) resultMessage.get("status");

        System.out.println("Got result for job: " + jobId);
        System.out.println("Status: " + status);

        // Extract answer from payload
        String answer = "No answer available";
        Object payload = resultMessage.get("payload");

        if (payload instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> payloadMap = (Map<String, Object>) payload;
            Object content = payloadMap.get("content");
            if (content != null) {
                answer = content.toString();
            }
        }

        System.out.println("Answer extracted: " + answer.substring(0, Math.min(100, answer.length())));

        // Update job status in JobService
        if ("TASK_COMPLETED".equals(status)) {
            Map<String, String> jobData = jobService.getJobStatus(jobId);
            if (jobData != null && jobData.containsKey("conversationId")) {
                try {
                    String conversationIdStr = jobData.get("conversationId");
                    System.out.println("Processing result for conversationId: " + conversationIdStr);
                    Integer conversationId = Integer.valueOf(conversationIdStr);
                    conversationService.saveAgentMessage(conversationId, answer);
                    System.out.println("Successfully saved agent message for conversationId: " + conversationId);
                } catch (NumberFormatException e) {
                    System.err.println("Error parsing conversationId: " + jobData.get("conversationId"));
                } catch (Exception e) {
                    System.err.println("Error saving agent message: " + e.getMessage());
                    e.printStackTrace();
                }
            } else {
                System.err.println("conversationId NOT FOUND for job: " + jobId + ". JobData: " + jobData);
            }
            jobService.updateJobResult(jobId, "completed", answer);
        } else {
            System.out.println("Job status is not TASK_COMPLETED, it is: " + status);
            jobService.updateJobResult(jobId, "error", "Task failed: " + status);
        }
    }

    @RabbitListener(queues = "${app.queue.code.results}")
    public void receiveCodeExecutionResults(Map<String, Object> resultMessage) {
        // TODO: save generated code to conversation
        System.out.println("Got result for job: " + resultMessage.get("jobId"));
        System.out.println("Status: " + resultMessage.get("status"));
        System.out.println("Generated Code Result: " + resultMessage.get("generatedCode"));

        String jobId = (String) resultMessage.get("jobId");

        if (jobId != null) {
            redisTemplate.opsForValue().set(jobId, resultMessage, 10, TimeUnit.MINUTES);
            System.out.println("Result for job " + jobId + " saved to Redis.");
        }
    }
}
