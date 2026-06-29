package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DictationService {

    private final DictationTopicRepository dictationTopicRepository;
    private final DictationAudioRepository dictationAudioRepository;
    private final DictationQuestionRepository dictationQuestionRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository; // Thêm repo này

    public DictationService(DictationTopicRepository dictationTopicRepository, 
                            DictationAudioRepository dictationAudioRepository, 
                            DictationQuestionRepository dictationQuestionRepository, 
                            StudyRecordRepository studyRecordRepository, 
                            UserRepository userRepository,
                            StudentClassRepository studentClassRepository) {
        this.dictationTopicRepository = dictationTopicRepository;
        this.dictationAudioRepository = dictationAudioRepository;
        this.dictationQuestionRepository = dictationQuestionRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
    }

    // --- CÁC HÀM GET DỮ LIỆU ĐỂ HỌC VIÊN LÀM BÀI ---
    public List<DictationTopic> getTopicsByClass(Long classId) { return dictationTopicRepository.findByStudentClassId(classId); }
    public List<DictationAudio> getAudiosByTopic(Long topicId) { return dictationAudioRepository.findByTopicId(topicId); }
    public List<DictationQuestion> getQuestionsByAudio(Long audioId) { return dictationQuestionRepository.findByAudioIdOrderByStartTimeAsc(audioId); }

    // --- CÁC HÀM CRUD MỚI DÀNH CHO ADMIN ---
    public DictationTopic createTopic(Long classId, DictationTopic topic) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        topic.setStudentClass(studentClass);
        return dictationTopicRepository.save(topic);
    }
    public void deleteTopic(Long topicId) { dictationTopicRepository.deleteById(topicId); }

    public DictationAudio createAudio(Long topicId, DictationAudio audio) {
        DictationTopic topic = dictationTopicRepository.findById(topicId).orElseThrow();
        audio.setTopic(topic);
        return dictationAudioRepository.save(audio);
    }
    public void deleteAudio(Long audioId) { dictationAudioRepository.deleteById(audioId); }

    public DictationQuestion createQuestion(Long audioId, DictationQuestion question) {
        DictationAudio audio = dictationAudioRepository.findById(audioId).orElseThrow();
        question.setAudio(audio);
        return dictationQuestionRepository.save(question);
    }
    public void deleteQuestion(Long questionId) { dictationQuestionRepository.deleteById(questionId); }

    // --- LOGIC CHẤM ĐIỂM (Giữ nguyên) ---
    public StudyRecord gradeDictation(Long audioId, Map<Long, String> studentAnswers, int duration) {
        List<DictationQuestion> questions = dictationQuestionRepository.findByAudioIdOrderByStartTimeAsc(audioId);
        int correctCount = 0;
        for (DictationQuestion q : questions) {
            String studentAns = studentAnswers.get(q.getId());
            if (studentAns != null && studentAns.trim().equalsIgnoreCase(q.getTranscript().trim())) {
                correctCount++;
            }
        }
        float score = questions.isEmpty() ? 0 : (float) correctCount / questions.size() * 100;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("DICTATION"); 
        record.setRefId(audioId);
        record.setScore(score);
        record.setDurationSeconds(duration);
        
        return studyRecordRepository.save(record);
    }
}