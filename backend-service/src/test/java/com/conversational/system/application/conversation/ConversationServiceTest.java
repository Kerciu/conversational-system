package com.conversational.system.application.conversation;

import com.conversational.system.application.entities.conversation.AgentConversation;
import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.conversation.Message;
import com.conversational.system.application.entities.conversation.repositories.AgentConversationRepository;
import com.conversational.system.application.entities.conversation.repositories.ConversationRepository;
import com.conversational.system.application.entities.conversation.repositories.MessageRepository;
import com.conversational.system.application.entities.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private AgentConversationRepository agentConversationRepository;
    @Mock
    private MessageRepository messageRepository;

    @InjectMocks
    private ConversationService conversationService;

    private User testUser;
    private UUID conversationId;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1);
        testUser.setUsername("testuser");

        conversationId = UUID.randomUUID();
    }

    @Test
    void createConversation_ShouldSaveAndReturnConversation() {
        String title = "Test Title";
        Conversation conv = new Conversation(testUser, title);
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conv);

        Conversation result = conversationService.createConversation(testUser, title);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo(title);
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void getOrCreateAgentConversation_ShouldReturnExisting_WhenFound() {
        String agentType = "test-agent";
        AgentConversation existing = new AgentConversation();

        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(new Conversation()));
        when(agentConversationRepository.findByConversationIdAndAgentType(conversationId, agentType))
                .thenReturn(Optional.of(existing));

        AgentConversation result = conversationService.getOrCreateAgentConversation(conversationId, agentType);

        assertThat(result).isSameAs(existing);
        verify(agentConversationRepository, never()).save(any());
    }

    @Test
    void getOrCreateAgentConversation_ShouldCreateNew_WhenNotFound() {
        String agentType = "test-agent";
        Conversation conv = new Conversation();
        conv.setId(conversationId);

        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(agentConversationRepository.findByConversationIdAndAgentType(conversationId, agentType))
                .thenReturn(Optional.empty());
        when(agentConversationRepository.save(any(AgentConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AgentConversation result = conversationService.getOrCreateAgentConversation(conversationId, agentType);

        assertThat(result).isNotNull();
        assertThat(result.getAgentType()).isEqualTo(agentType);
        verify(agentConversationRepository).save(any(AgentConversation.class));
    }

    @Test
    void getOrCreateAgentConversation_ShouldThrow_WhenConversationNotFound() {
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> conversationService.getOrCreateAgentConversation(conversationId, "agent"));
    }

    @Test
    void saveUserMessage_ShouldSaveAndReturnMessage() {
        String agentType = "agent";
        String content = "Hello";
        String jobId = "job123";

        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        AgentConversation agentConv = new AgentConversation(conv, agentType);

        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conv));
        when(agentConversationRepository.findByConversationIdAndAgentType(conversationId, agentType))
                .thenReturn(Optional.of(agentConv));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Message result = conversationService.saveUserMessage(conversationId, agentType, content, jobId);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo(content);
        assertThat(result.getRole()).isEqualTo("user");
        verify(messageRepository).save(any(Message.class));
    }

    @Test
    void saveAssistantMessage_ShouldSaveAndReturnMessage() {
        String jobId = "job123";
        String content = "Response";

        AgentConversation agentConv = new AgentConversation(new Conversation(), "agent");
        Message userMsg = new Message(agentConv, "user", "Hello", jobId);

        when(messageRepository.findByJobId(jobId)).thenReturn(Optional.of(userMsg));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Message result = conversationService.saveAssistantMessage(jobId, content);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo(content);
        assertThat(result.getRole()).isEqualTo("assistant");
        verify(messageRepository).save(any(Message.class));
    }

    @Test
    void getConversationHistory_ShouldReturnFormattedList() {
        String agentType = "agent";
        AgentConversation agentConv = new AgentConversation();
        UUID agentConvId = UUID.randomUUID();
        agentConv.setId(agentConvId);

        Message msg1 = new Message(agentConv, "user", "Hi", "j1");
        msg1.setId(UUID.randomUUID());
        Message msg2 = new Message(agentConv, "assistant", "Hello", "j1");
        msg2.setId(UUID.randomUUID());

        when(agentConversationRepository.findByConversationIdAndAgentType(conversationId, agentType))
                .thenReturn(Optional.of(agentConv));
        when(messageRepository.findByAgentConversationIdOrderByTimestampAsc(agentConvId))
                .thenReturn(Arrays.asList(msg1, msg2));

        List<Map<String, Object>> result = conversationService.getConversationHistory(conversationId, agentType);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).get("role")).isEqualTo("user");
        assertThat(result.get(1).get("role")).isEqualTo("assistant");
    }

    @Test
    void getConversationHistory_ShouldReturnEmpty_WhenAgentConvNotFound() {
        when(agentConversationRepository.findByConversationIdAndAgentType(any(), any()))
                .thenReturn(Optional.empty());

        List<Map<String, Object>> result = conversationService.getConversationHistory(conversationId, "agent");

        assertThat(result).isEmpty();
    }

    @Test
    void deleteConversation_ShouldCallRepository() {
        conversationService.deleteConversation(conversationId);
        verify(conversationRepository).deleteById(conversationId);
    }
}
