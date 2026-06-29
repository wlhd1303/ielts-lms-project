package com.ielts.lms.controller;

import com.ielts.lms.entity.MockQuestion;
import com.ielts.lms.entity.MockTest;
import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.service.MockTestService;
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

    // API HỌC VIÊN
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

    // API ADMIN CRUD
    @PostMapping("/class/{classId}")
    public MockTest createTest(@PathVariable Long classId, @RequestBody MockTest mockTest) {
        return mockTestService.createTest(classId, mockTest);
    }

    @DeleteMapping("/{testId}")
    public void deleteTest(@PathVariable Long testId) {
        mockTestService.deleteTest(testId);
    }

    @PostMapping("/{testId}/answers")
    public void saveAnswerKey(@PathVariable Long testId, @RequestBody List<MockQuestion> questions) {
        mockTestService.saveAnswerKey(testId, questions);
    }

    @GetMapping("/{testId}/answers")
    public List<MockQuestion> getAnswers(@PathVariable Long testId) {
        return mockTestService.getAnswers(testId);
    }

    @GetMapping("/{testId}/questions")
    public List<Map<String, Object>> getQuestionsForStudent(@PathVariable Long testId) {
        return mockTestService.getQuestionsForStudent(testId);
    }
}