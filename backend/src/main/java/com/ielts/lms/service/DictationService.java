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
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService;

    public DictationService(DictationTopicRepository dictationTopicRepository, 
                            DictationAudioRepository dictationAudioRepository, 
                            DictationQuestionRepository dictationQuestionRepository, 
                            StudyRecordRepository studyRecordRepository, 
                            UserRepository userRepository,
                            StudentClassRepository studentClassRepository,
                            StreakService streakService) {
        this.dictationTopicRepository = dictationTopicRepository;
        this.dictationAudioRepository = dictationAudioRepository;
        this.dictationQuestionRepository = dictationQuestionRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    // --- CÁC HÀM GET DỮ LIỆU ĐỂ HỌC VIÊN LÀM BÀI ---
    public List<DictationTopic> getTopicsByClass(Long classId) { 
        return dictationTopicRepository.findByStudentClassId(classId); 
    }
    
    public List<DictationAudio> getAudiosByTopic(Long topicId) { 
        return dictationAudioRepository.findByTopicId(topicId); 
    }
    
    public List<DictationQuestion> getQuestionsByAudio(Long audioId) { 
        return dictationQuestionRepository.findByAudioIdOrderByStartTimeAsc(audioId); 
    }

    // --- CÁC HÀM CRUD DÀNH CHO ADMIN ---
    public DictationTopic createTopic(Long classId, DictationTopic topic) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        topic.setStudentClass(studentClass);
        return dictationTopicRepository.save(topic);
    }
    
    public void deleteTopic(Long topicId) { 
        dictationTopicRepository.deleteById(topicId); 
    }

    public DictationAudio createAudio(Long topicId, DictationAudio audio) {
        DictationTopic topic = dictationTopicRepository.findById(topicId).orElseThrow();
        audio.setTopic(topic);
        return dictationAudioRepository.save(audio);
    }
    
    public void deleteAudio(Long audioId) { 
        dictationAudioRepository.deleteById(audioId); 
    }

    public DictationQuestion createQuestion(Long audioId, DictationQuestion question) {
        DictationAudio audio = dictationAudioRepository.findById(audioId).orElseThrow();
        question.setAudio(audio);
        return dictationQuestionRepository.save(question);
    }
    
    public void deleteQuestion(Long questionId) { 
        dictationQuestionRepository.deleteById(questionId); 
    }

    // --- THUẬT TOÁN CHẤM ĐIỂM LINH HOẠT VÀ TỐI ƯU ---
    public StudyRecord gradeDictation(Long audioId, Map<Long, String> studentAnswers, int duration) {
        List<DictationQuestion> questions = dictationQuestionRepository.findByAudioIdOrderByStartTimeAsc(audioId);
        float totalScore = 0;

        for (DictationQuestion q : questions) {
            String studentAns = studentAnswers != null ? studentAnswers.get(q.getId()) : "";
            float similarity = calculateTextSimilarity(studentAns, q.getTranscript());
            
            if (similarity >= 0.85f) {
                totalScore += 100f;
            } else if (similarity >= 0.60f) {
                totalScore += (similarity * 100f);
            } else {
                totalScore += (similarity * 50f);
            }
        }
        
        float finalAverage = questions.isEmpty() ? 0 : (totalScore / questions.size());
        finalAverage = Math.min(100f, Math.max(0f, finalAverage));

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("DICTATION"); 
        record.setRefId(audioId);
        record.setScore(Math.round(finalAverage * 10.0) / 10.0);
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        streakService.updateStreakProgress(user, "DICTATION", audioId);

        return savedRecord;
    }

    // --- TIỆN ÍCH SO KHỚP VĂN BẢN (LEVENSHTEIN SIMILARITY) ---
    private float calculateTextSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0f;
        String clean1 = s1.trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", " ");
        String clean2 = s2.trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", " ");
        
        if (clean1.equals(clean2)) return 1.0f;
        if (clean1.isEmpty() || clean2.isEmpty()) return 0.0f;

        int distance = computeLevenshtein(clean1, clean2);
        int maxLen = Math.max(clean1.length(), clean2.length());
        return 1.0f - ((float) distance / maxLen);
    }

    private int computeLevenshtein(String lhs, String rhs) {
        int[] costs = new int[rhs.length() + 1];
        for (int j = 0; j <= rhs.length(); j++) costs[j] = j;
        for (int i = 1; i <= lhs.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= rhs.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), lhs.charAt(i - 1) == rhs.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[rhs.length()];
    }
}