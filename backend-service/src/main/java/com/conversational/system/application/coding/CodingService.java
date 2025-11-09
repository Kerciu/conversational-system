package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CodingService {

    private final RabbitTemplate rabbitTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.queue.code.execution}")
    private String codeExecutionQueue;

    public Map<String, String> executeCode(String code) {
        String jobId = UUID.randomUUID().toString();

        Map<String, String> message = Map.of(
                "jobId", jobId,
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
