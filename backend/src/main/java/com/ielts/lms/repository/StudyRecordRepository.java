package com.ielts.lms.repository;

import com.ielts.lms.entity.StudyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyRecordRepository extends JpaRepository<StudyRecord, Long> {
    
    // Bảng vinh danh Leaderboard: 
    // 1. Module thường (Dictation, Vocab, Mock Test, Writing): Lấy điểm cao nhất (MAX) của mỗi bài tập.
    // 2. Module Speaking: Chuẩn hóa theo Topic (tối đa 100đ/topic) = Tổng điểm các câu / Tổng số câu của Topic.
    // 3. Loại bỏ ROLE_ADMIN khỏi bảng xếp hạng.
    @Query(value = "SELECT u.username, ROUND(SUM(all_modules.best_score), 1) AS totalScore " +
                   "FROM users u " +
                   "JOIN (" +
                   "    SELECT user_id, module_type, ref_id, MAX(score) AS best_score " +
                   "    FROM study_records " +
                   "    WHERE module_type != 'SPEAKING' " +
                   "    GROUP BY user_id, module_type, ref_id " +
                   "    " +
                   "    UNION ALL " +
                   "    " +
                   "    SELECT " +
                   "        sent_best.user_id, " +
                   "        'SPEAKING' AS module_type, " +
                   "        ss.topic_id AS ref_id, " +
                   "        SUM(sent_best.score) / GREATEST((SELECT COUNT(*) FROM speaking_sentences WHERE topic_id = ss.topic_id), 1) AS best_score " +
                   "    FROM (" +
                   "        SELECT user_id, ref_id, MAX(score) AS score " +
                   "        FROM study_records " +
                   "        WHERE module_type = 'SPEAKING' " +
                   "        GROUP BY user_id, ref_id " +
                   "    ) sent_best " +
                   "    JOIN speaking_sentences ss ON sent_best.ref_id = ss.id " +
                   "    WHERE ss.topic_id IS NOT NULL " +
                   "    GROUP BY sent_best.user_id, ss.topic_id " +
                   ") all_modules ON u.id = all_modules.user_id " +
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