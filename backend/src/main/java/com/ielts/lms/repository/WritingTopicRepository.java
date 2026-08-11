// WritingTopicRepository.java
package com.ielts.lms.repository;

import com.ielts.lms.entity.WritingTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingTopicRepository extends JpaRepository<WritingTopic, Long> {
    List<WritingTopic> findByStudentClassId(Long classId);
}