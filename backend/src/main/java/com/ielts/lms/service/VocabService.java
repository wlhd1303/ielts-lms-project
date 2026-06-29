package com.ielts.lms.service;

import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.entity.VocabTopic;
import com.ielts.lms.entity.VocabWord;
import com.ielts.lms.repository.StudyRecordRepository;
import com.ielts.lms.repository.StudentClassRepository;
import com.ielts.lms.repository.UserRepository;
import com.ielts.lms.repository.VocabTopicRepository;
import com.ielts.lms.repository.VocabWordRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class VocabService {

    private final VocabTopicRepository vocabTopicRepository;
    private final VocabWordRepository vocabWordRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;

    public VocabService(VocabTopicRepository vocabTopicRepository, VocabWordRepository vocabWordRepository, 
                        StudyRecordRepository studyRecordRepository, UserRepository userRepository, 
                        StudentClassRepository studentClassRepository) {
        this.vocabTopicRepository = vocabTopicRepository;
        this.vocabWordRepository = vocabWordRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
    }

    public List<VocabTopic> getTopicsByClass(Long classId) {
        return vocabTopicRepository.findByStudentClassId(classId);
    }

    public List<VocabWord> getWordsByTopic(Long topicId) {
        return vocabWordRepository.findByTopicId(topicId);
    }

    // --- CÁC HÀM CRUD MỚI DÀNH CHO ADMIN ---
    public VocabTopic createTopic(Long classId, VocabTopic topic) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        topic.setStudentClass(studentClass);
        return vocabTopicRepository.save(topic);
    }

    public void deleteTopic(Long topicId) {
        vocabTopicRepository.deleteById(topicId);
    }

    public VocabWord createWord(Long topicId, VocabWord word) {
        VocabTopic topic = vocabTopicRepository.findById(topicId).orElseThrow();
        word.setTopic(topic);
        return vocabWordRepository.save(word);
    }

    public void deleteWord(Long wordId) {
        vocabWordRepository.deleteById(wordId);
    }

    // --- HÀM CHẤM ĐIỂM ---
    public StudyRecord gradeVocabTest(Long topicId, Map<Long, String> userAnswers, int duration) {
        List<VocabWord> words = vocabWordRepository.findByTopicId(topicId);
        int correctCount = 0;

        for (VocabWord word : words) {
            String ans = userAnswers.get(word.getId());
            if (ans != null && ans.equalsIgnoreCase(word.getVietnameseMeaning())) {
                correctCount++;
            }
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("VOCAB");
        record.setRefId(topicId);
        record.setScore(correctCount); 
        record.setDurationSeconds(duration);
        
        return studyRecordRepository.save(record);
    }
}