package com.conversational.system.application.job;

import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final UserRepository userRepository;

    @PostMapping("/submit-job")
    public ResponseEntity<Map<String, String>> testSubmitJob(
            @RequestBody JobDescriptionDto jobDescriptionDto,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            if (principal == null || principal.getUsername() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "error",
                        "message", "User not authenticated"));
            }

            // Fetch User entity from DB using username/email from JWT
            Optional<User> userOpt = userRepository.findByEmail(principal.getUsername());
            if (userOpt.isEmpty()) {
                // fallback by username
                userOpt = userRepository.findByUsername(principal.getUsername());
            }

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "error",
                        "message", "User not found"));
            }

            User user = userOpt.get();

            // Generate jobId on backend
            String jobId = "job-" + UUID.randomUUID().toString();
            jobDescriptionDto.setJobId(jobId);

            UUID conversationId = jobService.submitJob(jobDescriptionDto, user);
            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "jobId", jobId,
                    "conversationId", conversationId.toString()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Error submitting job: " + e.getMessage()));
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
