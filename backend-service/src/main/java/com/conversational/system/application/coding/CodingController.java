package com.conversational.system.application.coding;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class CodingController {

    private final CodingService codingService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitJob(
            @RequestParam("agentType") String agentType,
            @RequestParam("prompt") String prompt,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam(value = "acceptedModelMessageId", required = false) String acceptedModelMessageId,
            @RequestParam(value = "acceptedCodeMessageId", required = false) String acceptedCodeMessageId,
            @RequestPart(value = "files", required = false) MultipartFile[] files
    ) {
        try {
            CodingService.JobSubmissionResult result = codingService.submitJobWithFiles(
                    agentType, 
                    prompt, 
                    conversationId,
                    acceptedModelMessageId, 
                    acceptedCodeMessageId, 
                    files
            );

            return ResponseEntity.ok(Map.of(
                    "jobId", result.jobId(),
                    "status", "queued",
                    "conversationId", result.conversationId()
            ));

        } catch (Exception e) {
            e.printStackTrace(); 
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Error submitting job: " + e.getMessage()));
        }
    }

    @GetMapping("/get")
    public ResponseEntity<?> get(@RequestParam("jobId") String jobId) {
        Object result = codingService.getCodeExecutionResult(jobId);
        if (result != null) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of("status", "pending"));
        }
    }

    @PostMapping("/execute")
    public ResponseEntity<Map<String, String>> execute(@RequestBody CodingExecutionDto executionDto) {
        try {
            Map<String, String> result = codingService.executeCode(executionDto.getCode());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error executing code: " + e.getMessage()));
        }
    }
}