package com.ielts.lms.controller;

import com.ielts.lms.entity.MockQuestion;
import com.ielts.lms.entity.MockTest;
import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.service.MockTestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mock-tests")
public class MockTestController {

    private final MockTestService mockTestService;

    public MockTestController(MockTestService mockTestService) {
        this.mockTestService = mockTestService;
    }

    // --- API HỌC VIÊN ---
    @GetMapping("/class/{classId}")
    public List<MockTest> getTestsByClass(@PathVariable Long classId) {
        return mockTestService.getTestsByClass(classId);
    }

    @GetMapping("/{testId}")
    public MockTest getTestById(@PathVariable Long testId) {
        return mockTestService.getTestById(testId);
    }

    @PostMapping("/{testId}/submit")
    public StudyRecord submitTest(@PathVariable Long testId, @RequestBody Map<Integer, String> payload, @RequestParam int duration) {
        return mockTestService.gradeMockTest(testId, payload, duration);
    }

    // ⚡ 1. API HỌC VIÊN: LƯU TỪ 5 - 10 TỪ VỰNG SAU KHI LÀM BÀI READING
    @PostMapping("/{testId}/vocabularies")
    public ResponseEntity<String> saveExtractedVocabularies(@PathVariable Long testId, 
                                                             @RequestBody List<Map<String, String>> vocabList) {
        mockTestService.saveExtractedVocabularies(testId, vocabList);
        return ResponseEntity.ok("Lưu danh sách từ vựng thành công!");
    }

    // ⚡ 2. API HỌC VIÊN: LẤY CÂU HỎI TRẮC NGHIỆM TỪ VỰNG CHƯA TEST CHO BÀI MOCK TIẾP THEO
    @GetMapping("/pending-vocabularies")
    public List<Map<String, Object>> getPendingVocabularies() {
        return mockTestService.getPendingVocabularyQuiz();
    }

    // ⚡ 3. API HỌC VIÊN: NỘP BÀI TEST TỪ VỰNG TRƯỚC KHI VÀO ĐỀ READING MỚI
    @PostMapping("/submit-vocab-test")
    public StudyRecord submitVocabTest(@RequestBody Map<String, Object> payload) {
        float score = Float.parseFloat(payload.get("score").toString());
        int durationSeconds = Integer.parseInt(payload.get("durationSeconds").toString());
        return mockTestService.submitVocabTest(score, durationSeconds);
    }

    // ⚡ 4. API HỌC VIÊN: LẤY TỪ VỰNG REVIEW THEO ID BÀI READING (PHỤC VỤ MÀN HÌNH VOCAB REVIEW TEST)
    @GetMapping("/{testId}/extracted-words")
    public List<Map<String, Object>> getExtractedWordsByTestId(@PathVariable Long testId) {
        return mockTestService.getExtractedWordsByTestId(testId);
    }

    // --- API ADMIN CRUD ---
    @PostMapping("/class/{classId}")
    @PreAuthorize("hasRole('ADMIN')")
    public MockTest createTest(@PathVariable Long classId, @RequestBody MockTest mockTest) {
        return mockTestService.createTest(classId, mockTest);
    }

    @DeleteMapping("/{testId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteTest(@PathVariable Long testId) {
        mockTestService.deleteTest(testId);
    }

    @PostMapping("/{testId}/answers")
    @PreAuthorize("hasRole('ADMIN')")
    public void saveAnswerKey(@PathVariable Long testId, @RequestBody List<MockQuestion> questions) {
        mockTestService.saveAnswerKey(testId, questions);
    }

    @GetMapping("/{testId}/answers")
    @PreAuthorize("hasRole('ADMIN')")
    public List<MockQuestion> getAnswers(@PathVariable Long testId) {
        return mockTestService.getAnswers(testId);
    }

    @GetMapping("/{testId}/questions")
    public List<Map<String, Object>> getQuestionsForStudent(@PathVariable Long testId) {
        return mockTestService.getQuestionsForStudent(testId);
    }
}