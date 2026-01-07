package com.conversational.system.application.entities.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Integer> {
    public Optional<Conversation> findById(Integer id);

    public Optional<Conversation> findByTitle(String title);

    public List<Conversation> findAllByUserIdOrderByUpdatedAtDesc(Integer userId);

    public void deleteById(Integer conversationId);
}
