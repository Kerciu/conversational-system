package com.conversational.system.application.conversation;

import com.conversational.system.application.entities.conversation.*;
import com.conversational.system.application.entities.conversation.repositories.AgentConversationRepository;
import com.conversational.system.application.entities.conversation.repositories.ConversationRepository;
import com.conversational.system.application.entities.conversation.repositories.MessageRepository;
import com.conversational.system.application.entities.user.User;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final AgentConversationRepository agentConversationRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public Conversation createConversation(User user, String title) {
        Conversation conversation = new Conversation(user, title);
        return conversationRepository.save(conversation);
    }

    @Transactional
    public AgentConversation getOrCreateAgentConversation(UUID conversationId, String agentType) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        return agentConversationRepository
                .findByConversationIdAndAgentType(conversationId, agentType)
                .orElseGet(() -> {
                    AgentConversation agentConv = new AgentConversation(conversation, agentType);
                    return agentConversationRepository.save(agentConv);
                });
    }

    @Transactional
    public Message saveUserMessage(UUID conversationId, String agentType, String content, String jobId) {
        AgentConversation agentConversation = getOrCreateAgentConversation(conversationId, agentType);

        Message message = new Message(agentConversation, "user", content, jobId);
        message = messageRepository.save(message);

        agentConversation.updateTimestamp();
        agentConversation.getConversation().updateTimestamp();

        return message;
    }

    @Transactional
    public Message saveAssistantMessage(String jobId, String content) {
        Message userMessage = messageRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("User message with jobId not found"));

        AgentConversation agentConversation = userMessage.getAgentConversation();

        Message message = new Message(agentConversation, "assistant", content, jobId);
        message = messageRepository.save(message);

        agentConversation.updateTimestamp();
        agentConversation.getConversation().updateTimestamp();

        return message;
    }

    @Transactional(readOnly = true)
    public String getMessageContent(UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        return message.getContent();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConversationHistory(UUID conversationId, String agentType) {
        AgentConversation agentConversation = agentConversationRepository
                .findByConversationIdAndAgentType(conversationId, agentType)
                .orElse(null);

        if (agentConversation == null) {
            return Collections.emptyList();
        }

        List<Message> messages = messageRepository
                .findByAgentConversationIdOrderByTimestampAsc(agentConversation.getId());

        return messages.stream()
                .map(msg -> Map.of(
                        "id", (Object) msg.getId().toString(),
                        "role", msg.getRole(),
                        "content", msg.getContent()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Conversation> getUserConversations(User user) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(user.getId());
    }

    @Transactional(readOnly = true)
    public Optional<Conversation> getConversation(UUID conversationId) {
        return conversationRepository.findById(conversationId);
    }

    @Transactional
    public void deleteConversation(UUID conversationId) {
        conversationRepository.deleteById(conversationId);
    }
}
