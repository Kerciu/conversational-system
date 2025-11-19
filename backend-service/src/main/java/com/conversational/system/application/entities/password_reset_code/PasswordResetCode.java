package com.conversational.system.application.entities.password_reset_code;

import java.security.SecureRandom;
import java.util.Base64;

import com.conversational.system.application.entities.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "password_reset_code")
@NoArgsConstructor
public class PasswordResetCode {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_LENGTH_BYTES = 32; 

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private User user;

    @Column(name = "code", nullable = false)
    private String code;

    private String generateVerificationCode() {
        byte[] randomBytes = new byte[TOKEN_LENGTH_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        return  Base64
                    .getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(randomBytes);
    }
    public PasswordResetCode(User user) {
        this.user = user;
        this.code = generateVerificationCode();
    }
    
}