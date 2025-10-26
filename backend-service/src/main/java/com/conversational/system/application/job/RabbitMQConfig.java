package com.conversational.system.application.job;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String REQUEST_QUEUE = "job_requests_queue";
    public static final String REVIEW_QUEUE = "code_review_queue";
    public static final String EXECUTION_QUEUE = "execution_queue";
    public static final String RESULTS_QUEUE = "job_results_queue";

    @Bean
    public Queue jobResultsQueue() {
        return new Queue(RESULTS_QUEUE, true);
    }

    @Bean
    public Queue codeReviewQueue() {
        return new Queue(REVIEW_QUEUE, true);
    }
}
