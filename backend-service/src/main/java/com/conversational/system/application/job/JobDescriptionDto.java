package com.conversational.system.application.job;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class JobDescriptionDto {
    String jobId;
    String agentType;
    String prompt;
}
