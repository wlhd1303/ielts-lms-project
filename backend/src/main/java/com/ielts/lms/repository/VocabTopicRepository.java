package com.ielts.lms.repository;

import com.ielts.lms.entity.VocabTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VocabTopicRepository extends JpaRepository<VocabTopic, Long> {
    // Truy vấn danh sách chủ đề từ vựng phân theo ID lớp học của học viên
    List<VocabTopic> findByStudentClassId(Long classId);
}