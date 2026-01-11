package com.conversational.system.application.job;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class JobDescriptionDto {
    String jobId;
    String agentType;
    String prompt;
    UUID conversationId;
    String acceptedModel;
    String acceptedCode;
    UUID acceptedModelMessageId;
    UUID acceptedCodeMessageId;

    List<FileDto> files;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileDto {
        private String name;
        private String contentBase64;
    }
}