package com.conversational.system.application.authentication.code_generation;

import java.security.SecureRandom;

public class CodeGenerator {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public static String generate() {
        // Generate a 6-digit code (100000 to 999999)
        int code = 100000 + SECURE_RANDOM.nextInt(900000);
        return String.valueOf(code);
    }
}
