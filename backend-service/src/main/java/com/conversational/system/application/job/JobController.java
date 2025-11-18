package com.conversational.system.application.job;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/test")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping("/submit-job")
    public ResponseEntity<String> testSubmitJob(@RequestBody JobDescriptionDto jobDescriptionDto) {
        try {
            jobService.submitJob(jobDescriptionDto);
            return ResponseEntity.ok("Job submitted successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error submitting job: "+e.getMessage());
        }
    }
}
