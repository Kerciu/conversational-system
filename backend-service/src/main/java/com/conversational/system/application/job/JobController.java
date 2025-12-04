package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping("/submit-job")
    public ResponseEntity<Map<String, String>> testSubmitJob(@RequestBody JobDescriptionDto jobDescriptionDto) {
        try {
            jobService.submitJob(jobDescriptionDto);
            return ResponseEntity.ok(Map.of("status", "ok", "jobId", jobDescriptionDto.getJobId()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", "Error submitting job: "+e.getMessage()));
        }
    }

    @GetMapping("/get-job")
    public ResponseEntity<Map<String, String>> getJob(@RequestParam String jobId) {
        try {
            Map<String, String> result = jobService.getJobStatus(jobId);
            if ("completed".equals(result.get("status"))) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
