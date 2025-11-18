package com.conversational.system.application.config;

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

    @RabbitListener(queues = "${app.queue.code.review}")
    public void receiveJobResults(Map<String, String> resultMessage) {
        System.out.println("Got result for job: " + resultMessage.get("jobId"));
        System.out.println("Status: " + resultMessage.get("status"));
        System.out.println("Result: " + resultMessage.get("result"));
    }

    @RabbitListener(queues = "${app.queue.code.results}")
    public void receiveCodeExecutionResults(Map<String, Object> resultMessage) {
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
