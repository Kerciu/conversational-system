package com.conversational.system.application;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.conversational.system.application.security.AuthenticationService;

import jakarta.activation.DataSource;

@SpringBootTest
class ApplicationTests {
	@MockBean
    private DataSource dataSource;

	@MockBean
    private AuthenticationService authenticationService;

	@Test
	void contextLoads() {
	}

}
