package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class CodingController {

    private final CodingService codingService;

    @PostMapping("execute")
    public ResponseEntity<Map<String, String>> execute(@RequestBody CodingExecutionDto executionDto) {
        try {
            Map<String, String> result = codingService.executeCode(executionDto.getCode());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error submitting job: " + e.getMessage()));
        }
    }
}
