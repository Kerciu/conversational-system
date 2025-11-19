package com.conversational.system.application.entities.verification_code;

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
@Table(name = "verification_code")
@NoArgsConstructor
public class VerificationCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private User user;

    @Column(name = "code", nullable = false)
    private String code;

    public VerificationCode(User user) {
        this.user = user;
        this.code = generateVerificationCode();
    }

    private String generateVerificationCode() {
        // TODO: Implement a more secure code generation mechanism
        // Simple random 6-digit code generation
        int code = (int)(Math.random() * 900000) + 100000;
        return String.valueOf(code);
    }


}
