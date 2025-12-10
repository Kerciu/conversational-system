package com.conversational.system.application.entities.code;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.conversational.system.application.entities.conversation.Conversation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

enum ProgrammingLanguage {
    PYTHON,
    AMPL
}

@Entity
@Getter
@Setter
@Table(name = "code")
@NoArgsConstructor
public class Code {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "language", nullable = false)
    private ProgrammingLanguage language;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Code(Conversation conversation, String content, ProgrammingLanguage language) {
        this.conversation = conversation;
        this.content = content;
        this.language = language;
    }
}
