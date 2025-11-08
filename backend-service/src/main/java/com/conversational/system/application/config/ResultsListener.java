package com.conversational.system.application.config;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ResultsListener {

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
    }
}
