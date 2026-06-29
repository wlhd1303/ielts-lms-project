package com.ielts.lms.repository;

import com.ielts.lms.entity.VocabWord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabWordRepository extends JpaRepository<VocabWord, Long> {
    List<VocabWord> findByTopicId(Long topicId);
}