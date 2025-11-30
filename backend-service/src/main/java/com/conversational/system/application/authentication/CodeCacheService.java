package com.conversational.system.application.authentication;

import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class CodeCacheService {
    
    private static final String VERIFICATION_CODE_PREFIX = "verification:";
    private static final long VERIFICATION_CODE_TTL = 15; // minutes
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    public CodeCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    public void saveVerificationCode(String verificationCode, Integer userId) {
        String key = VERIFICATION_CODE_PREFIX + verificationCode;
        redisTemplate.opsForValue().set(key, userId, VERIFICATION_CODE_TTL, TimeUnit.MINUTES);
    }
    
    public Integer getUserIdByVerificationCode(String verificationCode) {
        String key = VERIFICATION_CODE_PREFIX + verificationCode;
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).intValue() : null;
    }
    
    public boolean deleteVerificationCode(String verificationCode) {
        String key = VERIFICATION_CODE_PREFIX + verificationCode;
        return Boolean.TRUE.equals(redisTemplate.delete(key));
    }
    
    public boolean verificationCodeExists(String verificationCode) {
        String key = VERIFICATION_CODE_PREFIX + verificationCode;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}