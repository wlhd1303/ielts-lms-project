package com.ielts.lms.service;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.StudyRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StudyRecordService {

    private final StudyRecordRepository studyRecordRepository;

    public StudyRecordService(StudyRecordRepository studyRecordRepository) {
        this.studyRecordRepository = studyRecordRepository;
    }

    /**
     * Lưu hoặc cập nhật điểm học tập theo cơ chế giữ điểm cao nhất (Best Score UPSERT).
     * Ngăn chặn hoàn toàn việc spam điểm và cộng dồn điểm ảo khi học viên làm lại bài nhiều lần.
     */
    @Transactional
    public StudyRecord saveOrUpdateBestScore(User user, String moduleType, Long refId, double score, int durationSeconds) {
        if (user == null || moduleType == null) {
            return null;
        }

        List<StudyRecord> existingList = studyRecordRepository.findByUserIdAndModuleTypeAndRefIdOrderByScoreDesc(
                user.getId(), moduleType, refId
        );

        if (existingList != null && !existingList.isEmpty()) {
            StudyRecord bestRecord = existingList.get(0);
            // Chỉ cập nhật nếu điểm mới cao hơn điểm cao nhất trước đó
            if (score > bestRecord.getScore()) {
                bestRecord.setScore(Math.round(score * 10.0) / 10.0);
                bestRecord.setDurationSeconds(durationSeconds);
                bestRecord.setCreatedAt(LocalDateTime.now());
                return studyRecordRepository.save(bestRecord);
            }
            // Nếu điểm mới thấp hơn hoặc bằng, giữ nguyên điểm cao nhất cũ
            return bestRecord;
        }

        StudyRecord newRecord = new StudyRecord();
        newRecord.setUser(user);
        newRecord.setModuleType(moduleType);
        newRecord.setRefId(refId);
        newRecord.setScore(Math.round(score * 10.0) / 10.0);
        newRecord.setDurationSeconds(durationSeconds);
        newRecord.setCreatedAt(LocalDateTime.now());
        return studyRecordRepository.save(newRecord);
    }
}
