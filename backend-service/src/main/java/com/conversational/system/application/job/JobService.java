package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class JobService {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.queue.request}")
    private String requestQueueName;

    public void submitJob(JobDescriptionDto jobDescriptionDto) {
        Map<String, String> message = Map.of(
                "jobId", jobDescriptionDto.getJobId(),
                "jobDescription", jobDescriptionDto.getJobDescription()
        );

        rabbitTemplate.convertAndSend(requestQueueName, message);
        System.out.println("Job " + jobDescriptionDto.getJobId() + " submitted");
    }
}
