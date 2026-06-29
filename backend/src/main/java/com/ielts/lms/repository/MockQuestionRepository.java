package com.ielts.lms.repository;

import com.ielts.lms.entity.MockQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MockQuestionRepository extends JpaRepository<MockQuestion, Long> {
    // Tìm tất cả các câu hỏi thuộc về 1 bài Test ID cụ thể
    List<MockQuestion> findByMockTestId(Long testId);
}