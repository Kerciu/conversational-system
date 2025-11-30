package com.conversational.system.application.authentication.code_generation;

import java.security.SecureRandom;
import java.util.Base64;

public class CodeGenerator {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_LENGTH_BYTES = 32;

    public static String generate() {
        byte[] randomBytes = new byte[TOKEN_LENGTH_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }   
}
