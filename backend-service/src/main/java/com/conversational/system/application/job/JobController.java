package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.conversational.system.application.authentication.AuthenticationService;
import com.conversational.system.application.entities.user.User;

import java.util.Map;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final AuthenticationService authenticationService;

    @PostMapping("/submit-job")
    public ResponseEntity<Map<String, String>> testSubmitJob(Authentication authentication, @RequestBody JobDescriptionDto jobDescriptionDto) {
        try {
            User user = authenticationService.extractUser(authentication);
            jobService.submitJob(user, jobDescriptionDto);
            return ResponseEntity.ok(Map.of("status", "ok", "jobId", jobDescriptionDto.getJobId()));
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", "Error submitting job: " + e.getMessage()));
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
            log.error(e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
