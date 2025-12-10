package com.conversational.system.application.visualization;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VisualizerService {

    private final RabbitTemplate rabbitTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.queue.visualization}")
    private String visualizationQueue;

    public Map<String, String> requestVisualization(String solverOutput, String context) {
        String jobId = UUID.randomUUID().toString();

        Map<String, String> message = Map.of(
                "jobId", jobId,
                "taskType", "visualize",
                "solverOutput", solverOutput,
                "context", context
        );

        rabbitTemplate.convertAndSend(visualizationQueue, message);

        System.out.println("Visualization job submitted with jobId #" + jobId);
        
        return Map.of("jobId", jobId);
    }

    public Object getVisualizationResult(String jobId) {
        return redisTemplate.opsForValue().get(jobId);
    }
}