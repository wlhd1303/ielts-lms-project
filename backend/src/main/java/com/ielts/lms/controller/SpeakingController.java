package com.ielts.lms.controller;

import com.ielts.lms.entity.SpeakingLesson;
import com.ielts.lms.entity.SpeakingSentence;
import com.ielts.lms.entity.SpeakingTopic;
import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.repository.SpeakingLessonRepository;
import com.ielts.lms.service.SpeakingService;
import org.springframework.security.access.prepost.PreAuthorize;
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

    // ==========================================
    // --- API CHỦ ĐỀ (TOPICS) ---
    // ==========================================
    @GetMapping("/class/{classId}/topics")
    public List<SpeakingTopic> getTopicsByClass(@PathVariable Long classId) {
        return speakingService.getTopicsByClass(classId);
    }

    @PostMapping("/class/{classId}/topics")
    @PreAuthorize("hasRole('ADMIN')")
    public SpeakingTopic createTopic(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        return speakingService.createTopic(classId, body.get("name"));
    }

    @DeleteMapping("/topics/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteTopic(@PathVariable Long topicId) {
        speakingService.deleteTopic(topicId);
    }

    // ==========================================
    // --- API CÂU LUYỆN NÓI (SENTENCES) ---
    // ==========================================
    @GetMapping("/topics/{topicId}/sentences")
    public List<SpeakingSentence> getSentencesByTopic(@PathVariable Long topicId) {
        return speakingService.getSentencesByTopic(topicId);
    }

    @PostMapping("/topics/{topicId}/sentences")
    @PreAuthorize("hasRole('ADMIN')")
    public SpeakingSentence createSentence(@PathVariable Long topicId, @RequestBody SpeakingSentence sentence) {
        return speakingService.createSentence(topicId, sentence);
    }

    @DeleteMapping("/sentences/{sentenceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteSentence(@PathVariable Long sentenceId) {
        speakingService.deleteSentence(sentenceId);
    }

    @PostMapping("/sentences/{sentenceId}/submit")
    public StudyRecord submitSentence(@PathVariable Long sentenceId,
                                      @RequestBody Map<String, Object> payload,
                                      @RequestParam int duration) {
        return speakingService.submitSentenceScore(sentenceId, payload, duration);
    }

    // =========================================================
    // --- API BÀI CŨ (GIỮ TƯƠNG THÍCH NẾU CÓ CLIENT NÀO GỌI) ---
    // =========================================================
    @GetMapping("/class/{classId}")
    public List<SpeakingLesson> getLessonsByClass(@PathVariable Long classId) {
        return speakingLessonRepository.findByStudentClassId(classId);
    }

    @PostMapping("/class/{classId}")
    @PreAuthorize("hasRole('ADMIN')")
    public SpeakingLesson createLesson(@PathVariable Long classId, @RequestBody Map<String, String> body) {
        String title = body.get("title");
        String content = body.get("content");
        return speakingService.createLesson(classId, title, content);
    }

    @DeleteMapping("/{lessonId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteLesson(@PathVariable Long lessonId) {
        speakingService.deleteLesson(lessonId);
    }

    @PostMapping("/{lessonId}/submit")
    public StudyRecord submit(@PathVariable Long lessonId, 
                              @RequestBody Map<String, Object> payload,
                              @RequestParam int duration) {
        return speakingService.submitSpeakingScore(lessonId, payload, duration);
    }
}