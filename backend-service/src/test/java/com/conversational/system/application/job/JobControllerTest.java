package com.conversational.system.application.job;

import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.conversational.system.application.authentication.json_web_token.JwtService;
import org.springframework.security.core.userdetails.UserDetailsService;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JobController.class)
public class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobService jobService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1);
        testUser.setUsername("testuser");
        testUser.setEmail("testuser@example.com");
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void testSubmitJob_ShouldReturnOk() throws Exception {
        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(testUser));
        when(jobService.submitJob(any(JobDescriptionDto.class), any(User.class))).thenReturn(UUID.randomUUID());

        MockMultipartFile file = new MockMultipartFile("files", "test.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/test/submit-job")
                .file(file)
                .param("agentType", "coder")
                .param("prompt", "write code")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.jobId").exists());
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void getJob_ShouldReturnStatus() throws Exception {
        when(jobService.getJobStatus("job123")).thenReturn(Map.of("status", "completed", "answer", "done"));

        mockMvc.perform(get("/api/test/get-job").param("jobId", "job123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"));
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void getJob_ShouldReturnAccepted_WhenPending() throws Exception {
        when(jobService.getJobStatus("job123")).thenReturn(Map.of("status", "pending"));

        mockMvc.perform(get("/api/test/get-job").param("jobId", "job123"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("pending"));
    }
}
