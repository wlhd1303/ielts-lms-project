package com.ielts.lms.repository;

import com.ielts.lms.entity.SpeakingTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpeakingTopicRepository extends JpaRepository<SpeakingTopic, Long> {
    List<SpeakingTopic> findByStudentClassId(Long classId);
}
