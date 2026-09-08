package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.VocabTopic;
import com.ielts.lms.entity.VocabWord;
import com.ielts.lms.service.VocabService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vocab")
public class VocabController {

    private final VocabService vocabService;

    public VocabController(VocabService vocabService) {
        this.vocabService = vocabService;
    }

    // --- API HỌC VIÊN ---
    @GetMapping("/class/{classId}/topics")
    public List<VocabTopic> getTopicsByClass(@PathVariable Long classId) { 
        return vocabService.getTopicsByClass(classId); 
    }

    @GetMapping("/topics/{topicId}/words")
    public List<VocabWord> getWordsByTopic(@PathVariable Long topicId) { 
        return vocabService.getWordsByTopic(topicId); 
    }

    @GetMapping("/topics/{topicId}/quiz")
    public List<Map<String, Object>> getQuizByTopic(@PathVariable Long topicId) { 
        return vocabService.getQuizByTopic(topicId); 
    }

    @PostMapping("/{topicId}/submit")
    public Map<String, Object> submit(@PathVariable Long topicId, @RequestBody Map<Long, String> answers, @RequestParam int duration) {
        return vocabService.gradeVocabTest(topicId, answers, duration);
    }

    // ⚡ MỚI: API NỘP BÀI KIỂM TRA PHẢN XẠ LISTENING VOCAB
    @PostMapping("/topics/{topicId}/listening-submit")
    public StudyRecord submitListeningVocabScore(@PathVariable Long topicId, 
                                                 @RequestBody Map<String, Float> payload,
                                                 @RequestParam int duration) {
        float score = payload.get("score");
        return vocabService.submitListeningVocabScore(topicId, score, duration);
    }

    // --- API ADMIN (THÊM, XÓA) ---
    @PostMapping("/class/{classId}/topics")
    @PreAuthorize("hasRole('ADMIN')")
    public VocabTopic createTopic(@PathVariable Long classId, @RequestBody VocabTopic topic) {
        return vocabService.createTopic(classId, topic);
    }

    @DeleteMapping("/topics/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteTopic(@PathVariable Long topicId) {
        vocabService.deleteTopic(topicId);
    }

    @PostMapping("/topics/{topicId}/words")
    @PreAuthorize("hasRole('ADMIN')")
    public VocabWord createWord(@PathVariable Long topicId, @RequestBody VocabWord word) {
        return vocabService.createWord(topicId, word);
    }

    @DeleteMapping("/words/{wordId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteWord(@PathVariable Long wordId) {
        vocabService.deleteWord(wordId);
    }
}