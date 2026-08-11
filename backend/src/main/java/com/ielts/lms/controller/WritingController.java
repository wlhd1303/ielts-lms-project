package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.WritingPrompt;
import com.ielts.lms.entity.WritingTopic;
import com.ielts.lms.service.WritingService;
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
    public WritingTopic createTopic(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        return writingService.createTopic(classId, body.get("name"));
    }

    @DeleteMapping("/topics/{topicId}")
    public void deleteTopic(@PathVariable Long topicId) {
        writingService.deleteTopic(topicId);
    }

    // API Prompts theo Topic
    @GetMapping("/topics/{topicId}/prompts")
    public List<WritingPrompt> getPromptsByTopic(@PathVariable Long topicId) {
        return writingService.getPromptsByTopic(topicId);
    }

    @PostMapping("/topics/{topicId}/prompts")
    public WritingPrompt createPrompt(@PathVariable Long topicId, @RequestBody WritingPrompt prompt) {
        return writingService.createPrompt(topicId, prompt);
    }

    @DeleteMapping("/prompts/{promptId}")
    public void deletePrompt(@PathVariable Long promptId) {
        writingService.deletePrompt(promptId);
    }

    // API Submit
    @PostMapping("/{promptId}/submit")
    public StudyRecord submit(@PathVariable Long promptId, 
                              @RequestBody Map<String, String> payload,
                              @RequestParam int duration) {
        String answer = payload.get("answer");
        return writingService.gradeWriting(promptId, answer, duration);
    }
}