package com.ielts.lms.repository;

import com.ielts.lms.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {
    List<WritingPrompt> findByStudentClassId(Long classId);
}