package com.conversational.system.application.visualization;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/visualize")
@RequiredArgsConstructor
public class VisualizationController {

    private final VisualizerService visualizerService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generate(@RequestBody VisualizationRequestDto requestDto) {
        try {
            Map<String, String> result = visualizerService.requestVisualization(
                requestDto.getSolverOutput(), 
                requestDto.getContext()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Error requesting visualization: " + e.getMessage()));
        }
    }

    @GetMapping("/get")
    public ResponseEntity<?> get(@RequestBody VisualizationResultsDto resultsDto) {
        Object result = visualizerService.getVisualizationResult(resultsDto.getJobId());
        
        if (result != null) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of("status", "pending"));
        }
    }
}