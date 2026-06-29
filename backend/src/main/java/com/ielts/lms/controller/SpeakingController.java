package com.ielts.lms.controller;

import com.ielts.lms.entity.SpeakingLesson;
import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.repository.SpeakingLessonRepository;
import com.ielts.lms.service.SpeakingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/speaking")
public class SpeakingController {

    private final SpeakingService speakingService;
    private final SpeakingLessonRepository speakingLessonRepository;

    public SpeakingController(SpeakingService speakingService, SpeakingLessonRepository speakingLessonRepository) {
        this.speakingService = speakingService;
        this.speakingLessonRepository = speakingLessonRepository;
    }

    // API 1: Phục vụ cho UI gọi để hiển thị đề bài lên màn hình
    @GetMapping("/class/{classId}")
    public List<SpeakingLesson> getLessonsByClass(@PathVariable Long classId) {
        return speakingLessonRepository.findByStudentClassId(classId);
    }

    // API 2: Phục vụ cho UI nộp điểm sau khi thu âm xong
    @PostMapping("/{lessonId}/submit")
    public StudyRecord submit(@PathVariable Long lessonId, 
                              @RequestBody Map<String, Float> payload,
                              @RequestParam int duration) {
        return speakingService.submitSpeakingScore(lessonId, payload, duration);
    }
}