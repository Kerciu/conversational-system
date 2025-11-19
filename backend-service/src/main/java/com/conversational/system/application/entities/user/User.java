package com.conversational.system.application.entities.user;

import java.time.LocalDateTime;

import com.conversational.system.application.entities.password_reset_code.PasswordResetCode;
import com.conversational.system.application.entities.verification_code.VerificationCode;

import io.jsonwebtoken.security.Password;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
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
    
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private VerificationCode verificationCode;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private PasswordResetCode passwordResetCode;

    public User(String email, String username, String passwordHash) {
        this.email = email;
        this.username = username;
        this.passwordHash = passwordHash;
        this.creationDate = LocalDateTime.now();
        this.isVerified = true; // will be initialized to false when email verification is implemented
    }

    public void setVerificationCode(VerificationCode verificationCode) {
        if (verificationCode == null) {
            if (this.verificationCode != null) {
                this.verificationCode.setUser(null);
            }
        } else {
            verificationCode.setUser(this);
        }
        this.verificationCode = verificationCode;
    }
    
    public void setPasswordResetCode(PasswordResetCode passwordResetCode) {
        if (passwordResetCode == null) {
            if (this.passwordResetCode != null) {
                this.passwordResetCode.setUser(null);
            }
        } else {
            passwordResetCode.setUser(this);
        }
        this.passwordResetCode = passwordResetCode;
    }
}