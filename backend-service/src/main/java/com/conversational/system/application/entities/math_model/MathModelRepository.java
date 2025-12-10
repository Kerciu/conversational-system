package com.conversational.system.application.entities.math_model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MathModelRepository extends JpaRepository<MathModel, Integer> {
    Optional<MathModel> findById(Integer id);

    List<MathModel> findAllByConversationId(Integer conversationId);
}
