package com.conversational.system.application.job;

import com.conversational.system.application.conversation.ConversationService;
import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JobServiceTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private ConversationService conversationService;

    @InjectMocks
    private JobService jobService;

    private User testUser;
    private final String queueName = "test-queue";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1);
        testUser.setUsername("testuser");
        
        ReflectionTestUtils.setField(jobService, "requestQueueName", queueName);
    }

    @Test
    void submitJob_WithNewConversation_ShouldReturnId() {
        JobDescriptionDto dto = new JobDescriptionDto();
        dto.setJobId("job123");
        dto.setPrompt("Hello world");
        dto.setAgentType("agent");

        Conversation newConv = new Conversation();
        newConv.setId(UUID.randomUUID());

        when(conversationService.createConversation(eq(testUser), anyString())).thenReturn(newConv);
        when(conversationService.getConversationHistory(any(), anyString())).thenReturn(Collections.emptyList());

        UUID result = jobService.submitJob(dto, testUser);

        assertThat(result).isEqualTo(newConv.getId());
        verify(rabbitTemplate).convertAndSend(eq(queueName), any(Map.class));
        verify(conversationService).saveUserMessage(eq(newConv.getId()), eq("agent"), eq("Hello world"), eq("job123"));
    }

    @Test
    void submitJob_WithExistingConversation_ShouldReturnSameId() {
        UUID conversationId = UUID.randomUUID();
        JobDescriptionDto dto = new JobDescriptionDto();
        dto.setJobId("job123");
        dto.setConversationId(conversationId);
        dto.setPrompt("Hello");
        dto.setAgentType("agent");

        when(conversationService.getConversationHistory(eq(conversationId), anyString())).thenReturn(Collections.emptyList());

        UUID result = jobService.submitJob(dto, testUser);

        assertThat(result).isEqualTo(conversationId);
        verify(conversationService, never()).createConversation(any(), any());
    }

    @Test
    void submitJob_ShouldThrow_WhenUserIsNull() {
        assertThrows(IllegalArgumentException.class, () -> 
            jobService.submitJob(new JobDescriptionDto(), null));
    }

    @Test
    void updateJobResult_ShouldUpdateStatus() {
        String jobId = "job123";
        jobService.updateJobResult(jobId, "completed", "done", "msg1");

        Map<String, String> status = jobService.getJobStatus(jobId);
        assertThat(status.get("status")).isEqualTo("completed");
        assertThat(status.get("answer")).isEqualTo("done");
        assertThat(status.get("messageId")).isEqualTo("msg1");
    }

    @Test
    void hasActiveJob_ShouldReturnTrue_WhenPending() {
        UUID convId = UUID.randomUUID();
        String jobId = "job123";
        
        // Setup internal maps manually or via submitJob
        JobDescriptionDto dto = new JobDescriptionDto();
        dto.setJobId(jobId);
        dto.setConversationId(convId);
        dto.setPrompt("p");
        dto.setAgentType("a");

        when(conversationService.getConversationHistory(any(), any())).thenReturn(Collections.emptyList());
        jobService.submitJob(dto, testUser);

        assertThat(jobService.hasActiveJob(convId)).isTrue();

        jobService.updateJobResult(jobId, "completed", "ans");
        assertThat(jobService.hasActiveJob(convId)).isFalse();
    }

    @Test
    void hasLastError_ShouldReturnTrue_WhenFailed() {
        UUID convId = UUID.randomUUID();
        String jobId = "job123";
        
        JobDescriptionDto dto = new JobDescriptionDto();
        dto.setJobId(jobId);
        dto.setConversationId(convId);
        dto.setPrompt("p");
        dto.setAgentType("a");

        when(conversationService.getConversationHistory(any(), any())).thenReturn(Collections.emptyList());
        jobService.submitJob(dto, testUser);
        
        jobService.updateJobResult(jobId, "error", "failed");
        assertThat(jobService.hasLastError(convId)).isTrue();
    }
}
