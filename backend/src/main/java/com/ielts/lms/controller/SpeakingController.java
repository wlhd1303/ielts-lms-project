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

    // --- 1. LẤY DANH SÁCH BÀI HỌC THEO LỚP (CẢ ADMIN & HỌC VIÊN) ---
    @GetMapping("/class/{classId}")
    public List<SpeakingLesson> getLessonsByClass(@PathVariable Long classId) {
        return speakingLessonRepository.findByStudentClassId(classId);
    }

    // --- 2. TẠO BÀI LUYỆN NÓI MỚI (CHO ADMIN) ---
    @PostMapping("/class/{classId}")
    public SpeakingLesson createLesson(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        String title = body.get("title");
        String content = body.get("content");
        return speakingService.createLesson(classId, title, content);
    }

    // --- 3. XÓA BÀI LUYỆN NÓI (CHO ADMIN) ---
    @DeleteMapping("/{lessonId}")
    public void deleteLesson(@PathVariable Long lessonId) {
        speakingService.deleteLesson(lessonId);
    }

    // --- 4. CHẤM ĐIỂM VÀ LƯU STREAK (CHO HỌC VIÊN) ---
    @PostMapping("/{lessonId}/submit")
    public StudyRecord submit(@PathVariable Long lessonId, 
                              @RequestBody Map<String, Float> payload,
                              @RequestParam int duration) {
        return speakingService.submitSpeakingScore(lessonId, payload, duration);
    }
}