package com.conversational.system.application.controllers.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageDisplayResponse {
    private Integer id;
    private String role;
    private String content;
    private String timestamp;
}
