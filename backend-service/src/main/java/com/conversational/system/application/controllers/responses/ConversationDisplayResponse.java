package com.conversational.system.application.controllers.responses;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationDisplayResponse {
    private Integer id;
    private String title;
    private LocalDateTime updatedAt;
}
