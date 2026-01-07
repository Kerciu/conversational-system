package com.conversational.system.application.entities.conversation;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "message")
@NoArgsConstructor
public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "agent_conversation_id", nullable = false)
    private AgentConversation agentConversation;

    @Column(name = "role", nullable = false)
    private String role; // "user" or "assistant"

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "job_id")
    private String jobId;

    public Message(AgentConversation agentConversation, String role, String content, String jobId) {
        this.agentConversation = agentConversation;
        this.role = role;
        this.content = content;
        this.timestamp = LocalDateTime.now();
        this.jobId = jobId;
    }
}
