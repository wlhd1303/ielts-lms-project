package com.ielts.lms.repository;

import com.ielts.lms.entity.StudyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyRecordRepository extends JpaRepository<StudyRecord, Long> {
    
    // Bảng vinh danh Leaderboard: Chỉ tính điểm cao nhất (MAX) của mỗi bài tập duy nhất, loại bỏ ROLE_ADMIN
    @Query(value = "SELECT u.username, ROUND(SUM(sub.best_score), 1) as totalScore " +
                   "FROM users u " +
                   "JOIN (" +
                   "    SELECT user_id, module_type, ref_id, MAX(score) as best_score " +
                   "    FROM study_records " +
                   "    GROUP BY user_id, module_type, ref_id" +
                   ") sub ON u.id = sub.user_id " +
                   "WHERE u.role != 'ROLE_ADMIN' AND u.role != 'ADMIN' " +
                   "GROUP BY u.id, u.username " +
                   "ORDER BY totalScore DESC", nativeQuery = true)
    List<Object[]> getLeaderboard();

    List<StudyRecord> findTop10ByOrderByCreatedAtDesc();

    // Lấy toàn bộ lịch sử nộp bài mới nhất
    List<StudyRecord> findAllByOrderByCreatedAtDesc();

    // Lấy toàn bộ bài đã nộp của một học viên cụ thể
    List<StudyRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Tìm bản ghi theo học viên, loại module và id bài tập (sắp xếp điểm cao nhất trước)
    List<StudyRecord> findByUserIdAndModuleTypeAndRefIdOrderByScoreDesc(Long userId, String moduleType, Long refId);
}