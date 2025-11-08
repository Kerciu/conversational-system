package com.conversational.system.application.job;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Bean
    public Queue codeRequestQueue(@Value("${app.queue.code.request}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public Queue codeReviewQueue(@Value("${app.queue.code.review}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public Queue codeExecutionQueue(@Value("${app.queue.code.execution}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public Queue codeResultsQueue(@Value("${app.queue.code.results}") String queueName) {
        return new Queue(queueName, true);
    }
}
