package com.ielts.lms.repository;

import com.ielts.lms.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {
    
    // Tìm bài tập theo 1 Topic ID
    List<WritingPrompt> findByTopicId(Long topicId);
    
    // THÊM DÒNG NÀY: Tìm bài tập theo danh sách nhiều Topic IDs (Dùng cho Streak)
    List<WritingPrompt> findByTopicIdIn(List<Long> topicIds);
}