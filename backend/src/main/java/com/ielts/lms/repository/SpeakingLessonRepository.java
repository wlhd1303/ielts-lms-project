package com.ielts.lms.repository;

import com.ielts.lms.entity.SpeakingLesson;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpeakingLessonRepository extends JpaRepository<SpeakingLesson, Long> {
    // Lấy tất cả bài Speaking của một lớp học
    List<SpeakingLesson> findByStudentClassId(Long classId);
}