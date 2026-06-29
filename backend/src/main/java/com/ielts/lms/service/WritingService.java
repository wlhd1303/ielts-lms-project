package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WritingService {

    private final WritingPromptRepository writingPromptRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;

    public WritingService(WritingPromptRepository writingPromptRepository, StudyRecordRepository studyRecordRepository, UserRepository userRepository, StudentClassRepository studentClassRepository) {
        this.writingPromptRepository = writingPromptRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
    }

    // --- API DÀNH CHO ADMIN ---
    public List<WritingPrompt> getPromptsByClass(Long classId) {
        return writingPromptRepository.findByStudentClassId(classId);
    }

    public WritingPrompt createPrompt(Long classId, WritingPrompt prompt) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        prompt.setStudentClass(studentClass);
        return writingPromptRepository.save(prompt);
    }

    public void deletePrompt(Long id) {
        writingPromptRepository.deleteById(id);
    }

    // --- API CHẤM ĐIỂM (Giữ nguyên thuật toán của bạn) ---
    public StudyRecord gradeWriting(Long promptId, String userAnswer, int duration) {
        WritingPrompt prompt = writingPromptRepository.findById(promptId).orElseThrow();
        
        String keywordsStr = prompt.getKeywords();
        int matchedCount = 0;
        float score = 0;

        if (keywordsStr != null && !keywordsStr.trim().isEmpty()) {
            String[] keywords = keywordsStr.split(",");
            String normalizedAnswer = userAnswer.toLowerCase(); 
            
            for (String kw : keywords) {
                if (normalizedAnswer.contains(kw.trim().toLowerCase())) {
                    matchedCount++;
                }
            }
            score = (float) matchedCount / keywords.length * 100;
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("WRITING"); 
        record.setRefId(promptId);
        record.setScore(score); 
        record.setDurationSeconds(duration);
        
        return studyRecordRepository.save(record);
    }
}