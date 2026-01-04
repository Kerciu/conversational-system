package com.conversational.system.application.entities.conversation.repositories;

import com.conversational.system.application.entities.conversation.AgentConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentConversationRepository extends JpaRepository<AgentConversation, UUID> {
    List<AgentConversation> findByConversationId(UUID conversationId);
    
    Optional<AgentConversation> findByConversationIdAndAgentType(UUID conversationId, String agentType);
}
