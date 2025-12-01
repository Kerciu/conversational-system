package com.conversational.system.application.authentication;

import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.google.api.client.util.Value;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CodeCacheService {
    @Value("${app.security.verification-code-ttl-minutes:15}")
    private long verificationCodeTtl;
    
    @Value("${app.security.password-reset-code-ttl-minutes:15}")
    private long passwordResetCodeTtl;
    private static final String VERIFICATION_CODE_PREFIX = "verification:";
    private static final String PASSWORD_RESET_CODE_PREFIX = "password_reset:";
    private final RedisTemplate<String, Object> redisTemplate;
    
    // VERIFICATION CODE METHODS
    public void saveVerificationCode(String verificationCode, Integer userId) {
        saveCode(VERIFICATION_CODE_PREFIX, verificationCode, userId, verificationCodeTtl);
    }
    
    public Integer getUserIdByVerificationCode(String verificationCode) {
        return getUserIdByCode(VERIFICATION_CODE_PREFIX, verificationCode);
    }
    
    public boolean deleteVerificationCode(String verificationCode) {
        return deleteCode(VERIFICATION_CODE_PREFIX, verificationCode);
    }
    
    public boolean verificationCodeExists(String verificationCode) {
        return codeExists(VERIFICATION_CODE_PREFIX, verificationCode);
    }
    

    // PASSWORD RESET CODE METHODS
    public void savePasswordResetCode(String resetCode, Integer userId) {
        saveCode(PASSWORD_RESET_CODE_PREFIX, resetCode, userId, passwordResetCodeTtl);
    }
    
    public Integer getUserIdByPasswordResetCode(String resetCode) {
        return getUserIdByCode(PASSWORD_RESET_CODE_PREFIX, resetCode);
    }
    
    public boolean deletePasswordResetCode(String resetCode) {
        return deleteCode(PASSWORD_RESET_CODE_PREFIX, resetCode);
    }
    
    public boolean passwordResetCodeExists(String resetCode) {
        return codeExists(PASSWORD_RESET_CODE_PREFIX, resetCode);
    }
    

    // PRIVATE HELPER METHODS
    private void saveCode(String prefix, String code, Integer userId, long ttlMinutes) {
        String key = prefix + code;
        redisTemplate.opsForValue().set(key, userId, ttlMinutes, TimeUnit.MINUTES);
    }
    
    private Integer getUserIdByCode(String prefix, String code) {
        String key = prefix + code;
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).intValue() : null;
    }
    
    private boolean deleteCode(String prefix, String code) {
        String key = prefix + code;
        return Boolean.TRUE.equals(redisTemplate.delete(key));
    }
    
    private boolean codeExists(String prefix, String code) {
        String key = prefix + code;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}