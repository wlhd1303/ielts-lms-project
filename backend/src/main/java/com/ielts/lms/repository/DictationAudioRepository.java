package com.ielts.lms.repository;

import com.ielts.lms.entity.DictationAudio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DictationAudioRepository extends JpaRepository<DictationAudio, Long> {
    List<DictationAudio> findByTopicId(Long topicId);
}