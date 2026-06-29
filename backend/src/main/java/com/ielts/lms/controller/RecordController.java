package com.ielts.lms.controller;

import com.ielts.lms.repository.StudyRecordRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final StudyRecordRepository studyRecordRepository;

    public RecordController(StudyRecordRepository studyRecordRepository) {
        this.studyRecordRepository = studyRecordRepository;
    }

    // Lệnh GET: Lấy bảng vinh danh Leaderboard
    // API: GET http://localhost:8080/api/records/leaderboard
    @GetMapping("/leaderboard")
    public List<Object[]> getLeaderboard() {
        return studyRecordRepository.getLeaderboard();
    }
}   

