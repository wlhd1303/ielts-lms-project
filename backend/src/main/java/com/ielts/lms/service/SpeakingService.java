package com.ielts.lms.service;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.StudyRecordRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SpeakingService {

    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;

    public SpeakingService(StudyRecordRepository studyRecordRepository, UserRepository userRepository) {
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
    }

    public StudyRecord submitSpeakingScore(Long lessonId, Map<String, Float> payload, int duration) {
        // Tạm thời UI sẽ gửi điểm trực tiếp lên đây để lưu vết
        float score = payload.getOrDefault("score", 0f);

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("SPEAKING"); 
        record.setRefId(lessonId);
        record.setScore(score);
        record.setDurationSeconds(duration);
        
        return studyRecordRepository.save(record);
    }
}