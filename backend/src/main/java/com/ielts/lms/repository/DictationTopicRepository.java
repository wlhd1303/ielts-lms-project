package com.ielts.lms.repository;

import com.ielts.lms.entity.DictationTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DictationTopicRepository extends JpaRepository<DictationTopic, Long> {
    List<DictationTopic> findByStudentClassId(Long classId);
}