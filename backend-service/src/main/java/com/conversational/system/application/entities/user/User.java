package com.conversational.system.application.entities.user;

import java.time.LocalDateTime;
import java.util.List;

import com.conversational.system.application.entities.conversation.Conversation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "app_user")
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "username", unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "creation_date")
    private LocalDateTime creationDate;

    @Column(name = "is_verified", nullable = false)
    private boolean isVerified;

    public User(String email, String username, String passwordHash) {
        this.email = email;
        this.username = username;
        this.passwordHash = passwordHash;
        this.creationDate = LocalDateTime.now();
        this.isVerified = false;
    }

    // one user can have many conversations
    @OneToMany(mappedBy = "user")
    private List<Conversation> conversations;
}