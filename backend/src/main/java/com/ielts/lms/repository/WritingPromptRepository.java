package com.ielts.lms.repository;

import com.ielts.lms.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {
    
    // Tìm bài tập theo 1 Topic ID
    @Query("SELECT w FROM WritingPrompt w WHERE w.topic.id = :topicId")
    List<WritingPrompt> findByTopicId(@Param("topicId") Long topicId);
    
    // Tìm bài tập theo danh sách nhiều Topic IDs (Dùng cho Streak)
    @Query("SELECT w FROM WritingPrompt w WHERE w.topic.id IN :topicIds")
    List<WritingPrompt> findByTopicIdIn(@Param("topicIds") List<Long> topicIds);
}