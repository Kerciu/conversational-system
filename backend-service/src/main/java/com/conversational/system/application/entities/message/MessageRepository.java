package com.conversational.system.application.entities.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Integer> {
    public Optional<Message> findById(Integer id);

    public List<Message> findAllByConversationIdOrderByTimestampAsc(Integer conversationId);

}
