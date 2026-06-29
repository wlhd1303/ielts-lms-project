package com.ielts.lms.controller;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.repository.StudyRecordRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/study-records")
public class StudyRecordController {
    
    private final StudyRecordRepository studyRecordRepository;

    public StudyRecordController(StudyRecordRepository studyRecordRepository) {
        this.studyRecordRepository = studyRecordRepository;
    }

    @GetMapping("/recent")
    public List<StudyRecord> getRecentActivities() {
        return studyRecordRepository.findTop10ByOrderByCreatedAtDesc();
    }

    // THÊM API NÀY
    @GetMapping("/all")
    public List<StudyRecord> getAllRecords() {
        return studyRecordRepository.findAllByOrderByCreatedAtDesc();
    }
}