package com.conversational.system.application;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.RedisTemplate;

@SpringBootTest
class ApplicationTests {

	@TestConfiguration
	static class MockBeanConfiguration {

		@Bean
		@Primary
		public RabbitTemplate testRabbitTemplate() {
			return Mockito.mock(RabbitTemplate.class);
		}

		@Bean
		@Primary
		public RedisTemplate<String, Object> testRedisTemplate() {
			@SuppressWarnings("unchecked")
			RedisTemplate<String, Object> mockTemplate = (RedisTemplate<String, Object>) Mockito.mock(RedisTemplate.class);
			return mockTemplate;
		}
	}

	@Test
	void contextLoads() {
		System.out.println("Context loaded successfully with @Primary @Bean mocks!");
	}

}
