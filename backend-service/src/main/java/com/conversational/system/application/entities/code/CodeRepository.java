package com.conversational.system.application.entities.code;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import com.conversational.system.application.entities.conversation.Conversation;

@Repository
public interface CodeRepository extends JpaRepository<Code, Integer> {
    public Optional<Code> findById(Integer id);

    public List<Code> findByConversation(Conversation conversation);
}
