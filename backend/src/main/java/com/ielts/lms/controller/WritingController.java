package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.WritingPrompt;
import com.ielts.lms.entity.WritingTopic;
import com.ielts.lms.service.WritingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/writing")
public class WritingController {

    private final WritingService writingService;

    public WritingController(WritingService writingService) {
        this.writingService = writingService;
    }

    // API Topics
    @GetMapping("/class/{classId}/topics")
    public List<WritingTopic> getTopicsByClass(@PathVariable Long classId) {
        return writingService.getTopicsByClass(classId);
    }

    @PostMapping("/class/{classId}/topics")
    @PreAuthorize("hasRole('ADMIN')")
    public WritingTopic createTopic(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        return writingService.createTopic(classId, body.get("name"));
    }

    @DeleteMapping("/topics/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteTopic(@PathVariable Long topicId) {
        writingService.deleteTopic(topicId);
    }

    // API Prompts theo Topic
    @GetMapping("/topics/{topicId}/prompts")
    public List<WritingPrompt> getPromptsByTopic(@PathVariable Long topicId) {
        return writingService.getPromptsByTopic(topicId);
    }

    @GetMapping("/prompts/{promptId}")
    public WritingPrompt getPromptById(@PathVariable Long promptId) {
        return writingService.getPromptById(promptId);
    }

    @PostMapping("/topics/{topicId}/prompts")
    @PreAuthorize("hasRole('ADMIN')")
    public WritingPrompt createPrompt(@PathVariable Long topicId, @RequestBody WritingPrompt prompt) {
        return writingService.createPrompt(topicId, prompt);
    }

    @DeleteMapping("/prompts/{promptId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deletePrompt(@PathVariable Long promptId) {
        writingService.deletePrompt(promptId);
    }

    // API Submit
    @PostMapping("/{promptId}/submit")
    public Map<String, Object> submit(@PathVariable Long promptId, 
                                      @RequestBody Map<String, String> payload,
                                      @RequestParam int duration) {
        String answer = payload.get("answer");
        return writingService.gradeWriting(promptId, answer, duration);
    }
}