package com.ielts.lms.repository;

import com.ielts.lms.entity.StudyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyRecordRepository extends JpaRepository<StudyRecord, Long> {
    
    @Query("SELECT r.user.username, SUM(r.score) as totalScore FROM StudyRecord r GROUP BY r.user.id ORDER BY totalScore DESC")
    List<Object[]> getLeaderboard();

    List<StudyRecord> findTop10ByOrderByCreatedAtDesc();

    // THÊM HÀM NÀY: Lấy toàn bộ lịch sử nộp bài mới nhất
    List<StudyRecord> findAllByOrderByCreatedAtDesc();
}