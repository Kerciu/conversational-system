package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CodingService {

    private final RabbitTemplate rabbitTemplate;

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
}
