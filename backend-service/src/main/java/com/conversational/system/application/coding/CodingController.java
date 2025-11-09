package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("get")
    public ResponseEntity<?> get(@RequestBody CodingResultsDto resultsDto) {
        Object result = codingService.getCodeExecutionResult(resultsDto.getJobId());
        if (result != null) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of("status", "pending"));
        }
    }
}
