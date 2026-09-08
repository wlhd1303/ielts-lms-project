package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.StudyRecordRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/study-records")
public class StudyRecordController {
    
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;

    public StudyRecordController(StudyRecordRepository studyRecordRepository, UserRepository userRepository) {
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/recent")
    public List<StudyRecord> getRecentActivities() {
        return studyRecordRepository.findTop10ByOrderByCreatedAtDesc();
    }

    // Lấy toàn bộ bài tập đã làm của chính học viên đang đăng nhập
    @GetMapping("/my-records")
    public List<StudyRecord> getMyRecords() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(user -> studyRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId()))
                .orElse(Collections.emptyList());
    }

    // THÊM API NÀY
    @GetMapping("/all")
    public List<StudyRecord> getAllRecords() {
        return studyRecordRepository.findAllByOrderByCreatedAtDesc();
    }
}