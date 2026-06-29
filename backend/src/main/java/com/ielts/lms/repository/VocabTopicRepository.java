package com.ielts.lms.repository;

import com.ielts.lms.entity.VocabTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabTopicRepository extends JpaRepository<VocabTopic, Long> {
    // Tự động sinh lệnh SQL: SELECT * FROM vocab_topics WHERE class_id = ?
    List<VocabTopic> findByStudentClassId(Long classId);
}