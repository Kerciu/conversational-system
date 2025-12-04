package com.conversational.system.application.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileDto {
    private String username;
    private String email;
    private boolean isVerified;
    private String createdAt; 
}
