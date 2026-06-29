package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MockTestService {

    private final MockTestRepository mockTestRepository;
    private final MockQuestionRepository mockQuestionRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;

    public MockTestService(MockTestRepository mockTestRepository, 
                           MockQuestionRepository mockQuestionRepository, 
                           StudyRecordRepository studyRecordRepository, 
                           UserRepository userRepository,
                           StudentClassRepository studentClassRepository) {
        this.mockTestRepository = mockTestRepository;
        this.mockQuestionRepository = mockQuestionRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
    }

    // --- LẤY DỮ LIỆU ĐỂ HIỂN THỊ (HỌC VIÊN) ---
    public List<MockTest> getTestsByClass(Long classId) {
        return mockTestRepository.findByStudentClassId(classId);
    }

    public MockTest getTestById(Long testId) {
        return mockTestRepository.findById(testId).orElseThrow();
    }

    // --- CRUD DÀNH CHO ADMIN ---
    public MockTest createTest(Long classId, MockTest mockTest) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        mockTest.setStudentClass(studentClass);
        return mockTestRepository.save(mockTest);
    }

    public void deleteTest(Long testId) {
        mockTestRepository.deleteById(testId);
    }

    public void saveAnswerKey(Long testId, List<MockQuestion> questions) {
        MockTest test = mockTestRepository.findById(testId).orElseThrow();
        // Xóa đáp án cũ (nếu có) để nhập lại từ đầu
        mockQuestionRepository.deleteAll(mockQuestionRepository.findByMockTestId(testId));
        
        for (MockQuestion q : questions) {
            q.setMockTest(test);
        }
        mockQuestionRepository.saveAll(questions);
    }

    // --- HÀM CHẤM ĐIỂM (CỦA BẠN) ---
    public StudyRecord gradeMockTest(Long testId, Map<Integer, String> studentAnswers, int duration) {
        List<MockQuestion> correctAnswers = mockQuestionRepository.findByMockTestId(testId);
        int correctCount = 0;

        for (MockQuestion q : correctAnswers) {
            String studentAns = studentAnswers.get(q.getQuestionNumber());
            if (studentAns != null && studentAns.trim().equalsIgnoreCase(q.getCorrectAnswer().trim())) {
                correctCount++;
            }
        }
        
        float score = 0;
        if (!correctAnswers.isEmpty()) {
            score = (float) correctCount / correctAnswers.size() * 100;
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("MOCK_TEST"); 
        record.setRefId(testId);
        record.setScore(score);
        record.setDurationSeconds(duration);
        
        return studyRecordRepository.save(record);
    }
    public List<MockQuestion> getAnswers(Long testId) {
        return mockQuestionRepository.findByMockTestId(testId);
    }


    // Lấy câu hỏi cho học viên (Ẩn đáp án)
    public List<Map<String, Object>> getQuestionsForStudent(Long testId) {
        List<MockQuestion> questions = mockQuestionRepository.findByMockTestId(testId);
        return questions.stream().map(q -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("questionNumber", q.getQuestionNumber());
            map.put("questionText", q.getQuestionText());
            // KHÔNG TRẢ VỀ correctAnswer
            return map;
        }).collect(java.util.stream.Collectors.toList());
    }
}