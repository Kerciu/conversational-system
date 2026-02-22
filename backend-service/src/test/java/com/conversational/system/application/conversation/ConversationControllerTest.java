package com.conversational.system.application.conversation;

import com.conversational.system.application.entities.conversation.Conversation;
import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import com.conversational.system.application.job.JobService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import com.conversational.system.application.authentication.json_web_token.JwtService;
import org.springframework.security.core.userdetails.UserDetailsService;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ConversationController.class)
public class ConversationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConversationService conversationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JobService jobService;

    private User testUser;
    private UUID conversationId;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1);
        testUser.setUsername("testuser");
        testUser.setEmail("testuser@example.com");

        conversationId = UUID.randomUUID();
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void getUserConversations_ShouldReturnList() throws Exception {
        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        conv.setCreatedAt(LocalDateTime.now());
        conv.setUpdatedAt(LocalDateTime.now());

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(testUser));
        when(conversationService.getUserConversations(testUser)).thenReturn(Collections.singletonList(conv));

        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(conversationId.toString()))
                .andExpect(jsonPath("$[0].title").value("Title"));
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void getConversationHistory_ShouldReturnHistory_WhenOwner() throws Exception {
        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        conv.setUser(testUser);

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(testUser));
        when(conversationService.getConversation(conversationId)).thenReturn(Optional.of(conv));
        when(conversationService.getConversationHistory(conversationId, "agent"))
                .thenReturn(Collections.singletonList(Map.of("role", "user", "content", "hi")));

        mockMvc.perform(get("/api/conversations/{id}/history/agent", conversationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].role").value("user"));
    }

    @Test
    @WithMockUser(username = "other@example.com")
    void getConversationHistory_ShouldReturnForbidden_WhenNotOwner() throws Exception {
        User otherUser = new User();
        otherUser.setId(2);
        otherUser.setUsername("other");

        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        conv.setUser(testUser);

        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));
        when(conversationService.getConversation(conversationId)).thenReturn(Optional.of(conv));

        mockMvc.perform(get("/api/conversations/{id}/history/agent", conversationId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void deleteConversation_ShouldReturnOk() throws Exception {
        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        conv.setUser(testUser);

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(testUser));
        when(conversationService.getConversation(conversationId)).thenReturn(Optional.of(conv));

        mockMvc.perform(delete("/api/conversations/{id}", conversationId)
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));

        verify(conversationService).deleteConversation(conversationId);
    }

    @Test
    @WithMockUser(username = "testuser@example.com")
    void getConversationStatus_ShouldReturnStatus() throws Exception {
        Conversation conv = new Conversation(testUser, "Title");
        conv.setId(conversationId);
        conv.setUser(testUser);

        when(userRepository.findByEmail("testuser@example.com")).thenReturn(Optional.of(testUser));
        when(conversationService.getConversation(conversationId)).thenReturn(Optional.of(conv));
        when(jobService.hasActiveJob(conversationId)).thenReturn(true);
        when(jobService.getActiveJobId(conversationId)).thenReturn("job-123");

        mockMvc.perform(get("/api/conversations/{id}/status", conversationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isLoading").value(true))
                .andExpect(jsonPath("$.jobId").value("job-123"));
    }

    @Test
    void getUserConversations_ShouldReturnUnauthorized_WhenNotLoggedIn() throws Exception {
        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isFound()); // Redirects to login
    }
}
