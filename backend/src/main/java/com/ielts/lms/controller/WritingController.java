package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.WritingPrompt;
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

    @GetMapping("/class/{classId}")
    public List<WritingPrompt> getPromptsByClass(@PathVariable Long classId) {
        return writingService.getPromptsByClass(classId);
    }

    @PostMapping("/class/{classId}")
    public WritingPrompt createPrompt(@PathVariable Long classId, @RequestBody WritingPrompt prompt) {
        return writingService.createPrompt(classId, prompt);
    }

    @DeleteMapping("/{promptId}")
    public void deletePrompt(@PathVariable Long promptId) {
        writingService.deletePrompt(promptId);
    }

    @PostMapping("/{promptId}/submit")
    public StudyRecord submit(@PathVariable Long promptId, 
                              @RequestBody Map<String, String> payload,
                              @RequestParam int duration) {
        String answer = payload.get("answer");
        return writingService.gradeWriting(promptId, answer, duration);
    }
}