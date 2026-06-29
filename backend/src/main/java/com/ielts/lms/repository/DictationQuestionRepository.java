package com.ielts.lms.repository;

import com.ielts.lms.entity.DictationQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DictationQuestionRepository extends JpaRepository<DictationQuestion, Long> {
    
    // Câu lệnh này sẽ tự động tìm các câu hỏi theo audioId 
    // và sắp xếp (OrderBy) cột startTime theo thứ tự tăng dần (Asc)
    List<DictationQuestion> findByAudioIdOrderByStartTimeAsc(Long audioId);
    
    // Bạn vẫn có thể giữ lại hàm cũ nếu muốn an toàn
    List<DictationQuestion> findByAudioId(Long audioId);
}