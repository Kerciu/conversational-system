package com.conversational.system.application.job;

import com.conversational.system.application.entities.user.User;
import com.conversational.system.application.entities.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final UserRepository userRepository;

    @PostMapping(value = "/submit-job", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> testSubmitJob(
            @RequestParam("agentType") String agentType,
            @RequestParam("prompt") String prompt,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam(value = "acceptedModelMessageId", required = false) String acceptedModelMessageId,
            @RequestParam(value = "acceptedCodeMessageId", required = false) String acceptedCodeMessageId,

            @RequestParam(value = "files", required = false) MultipartFile[] files,

            @AuthenticationPrincipal UserDetails principal) {
        try {
            if (principal == null || principal.getUsername() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "error", "message", "User not authenticated"));
            }

            Optional<User> userOpt = userRepository.findByEmail(principal.getUsername());
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findByUsername(principal.getUsername());
            }

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", "error", "message", "User not found"));
            }
            User user = userOpt.get();

            JobDescriptionDto jobDescriptionDto = new JobDescriptionDto();
            String jobId = "job-" + UUID.randomUUID().toString();

            jobDescriptionDto.setJobId(jobId);
            jobDescriptionDto.setAgentType(agentType);
            jobDescriptionDto.setPrompt(prompt);

            if (conversationId != null && !conversationId.isEmpty() && !conversationId.equals("undefined")
                    && !conversationId.equals("null")) {
                try {
                    jobDescriptionDto.setConversationId(UUID.fromString(conversationId));
                } catch (IllegalArgumentException e) {
                    System.err.println("Invalid UUID format for conversationId: " + conversationId);
                }
            }

            if (acceptedModelMessageId != null && !acceptedModelMessageId.isEmpty()) {
                try {
                    jobDescriptionDto.setAcceptedModelMessageId(UUID.fromString(acceptedModelMessageId));
                } catch (IllegalArgumentException e) {
                    /* ignore */ }
            }

            if (acceptedCodeMessageId != null && !acceptedCodeMessageId.isEmpty()) {
                try {
                    jobDescriptionDto.setAcceptedCodeMessageId(UUID.fromString(acceptedCodeMessageId));
                } catch (IllegalArgumentException e) {
                    /* ignore */ }
            }

            List<JobDescriptionDto.FileDto> filePayloads = new ArrayList<>();

            if (files != null && files.length > 0) {
                for (MultipartFile file : files) {
                    if (!file.isEmpty()) {
                        byte[] fileBytes = file.getBytes();
                        String base64Content = Base64.getEncoder().encodeToString(fileBytes);

                        filePayloads.add(new JobDescriptionDto.FileDto(
                                file.getOriginalFilename(),
                                base64Content));
                    }
                }
            }
            jobDescriptionDto.setFiles(filePayloads);

            UUID newConversationId = jobService.submitJob(jobDescriptionDto, user);

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "jobId", jobId,
                    "conversationId", newConversationId.toString()));

        } catch (Exception e) {
            e.printStackTrace();
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