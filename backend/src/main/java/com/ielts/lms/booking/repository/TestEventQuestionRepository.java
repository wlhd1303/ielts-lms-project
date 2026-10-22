package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.TestEventQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestEventQuestionRepository extends JpaRepository<TestEventQuestion, Long> {

    List<TestEventQuestion> findByTestEventIdOrderBySkillAscQuestionNumberAsc(Long eventId);

    List<TestEventQuestion> findByTestEventIdAndSkillOrderByQuestionNumberAsc(Long eventId, String skill);

    void deleteByTestEventId(Long eventId);

    void deleteByTestEventIdAndSkill(Long eventId, String skill);
}
