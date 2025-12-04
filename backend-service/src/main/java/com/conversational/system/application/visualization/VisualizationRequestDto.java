package com.conversational.system.application.visualization;

import lombok.Data;

@Data
public class VisualizationRequestDto {
    private String solverOutput;
    private String context;
}