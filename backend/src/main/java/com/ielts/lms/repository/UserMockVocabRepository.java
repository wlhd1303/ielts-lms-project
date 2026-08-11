package com.ielts.lms.repository;

import com.ielts.lms.entity.UserMockVocab;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserMockVocabRepository extends JpaRepository<UserMockVocab, Long> {
    List<UserMockVocab> findByUserIdAndIsTestedFalse(Long userId);
    List<UserMockVocab> findByUserId(Long userId);
}