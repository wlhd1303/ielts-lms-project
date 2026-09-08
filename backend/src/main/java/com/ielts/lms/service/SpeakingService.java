package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SpeakingService {

    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final SpeakingLessonRepository speakingLessonRepository;
    private final SpeakingTopicRepository speakingTopicRepository;
    private final SpeakingSentenceRepository speakingSentenceRepository;
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService;

    // ⚡ ĐÃ HẠ ĐIỂM CHUẨN PASS XUỐNG 60.0% ĐỂ LINH HOẠT HƠN CHO HỌC VIÊN
    private static final float PASS_MARK = 60.0f;

    public SpeakingService(StudyRecordRepository studyRecordRepository, 
                           UserRepository userRepository,
                           SpeakingLessonRepository speakingLessonRepository,
                           SpeakingTopicRepository speakingTopicRepository,
                           SpeakingSentenceRepository speakingSentenceRepository,
                           StudentClassRepository studentClassRepository,
                           StreakService streakService) {
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.speakingLessonRepository = speakingLessonRepository;
        this.speakingTopicRepository = speakingTopicRepository;
        this.speakingSentenceRepository = speakingSentenceRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    // ==========================================
    // --- QUẢN LÝ CHỦ ĐỀ (TOPIC CRUD) ---
    // ==========================================
    public SpeakingTopic createTopic(Long classId, String name) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        SpeakingTopic topic = new SpeakingTopic();
        topic.setName(name);
        topic.setStudentClass(studentClass);
        return speakingTopicRepository.save(topic);
    }

    public List<SpeakingTopic> getTopicsByClass(Long classId) {
        return speakingTopicRepository.findByStudentClassId(classId);
    }

    public void deleteTopic(Long topicId) {
        speakingTopicRepository.deleteById(topicId);
    }

    // ==========================================
    // --- QUẢN LÝ CÂU LUYỆN NÓI (SENTENCE CRUD) ---
    // ==========================================
    public SpeakingSentence createSentence(Long topicId, SpeakingSentence sentence) {
        SpeakingTopic topic = speakingTopicRepository.findById(topicId).orElseThrow();
        sentence.setTopic(topic);
        if (sentence.getOrderIndex() == null) {
            int currentCount = speakingSentenceRepository.findByTopicIdOrderByOrderIndexAscIdAsc(topicId).size();
            sentence.setOrderIndex(currentCount + 1);
        }
        return speakingSentenceRepository.save(sentence);
    }

    public List<SpeakingSentence> getSentencesByTopic(Long topicId) {
        return speakingSentenceRepository.findByTopicIdOrderByOrderIndexAscIdAsc(topicId);
    }

    public void deleteSentence(Long sentenceId) {
        speakingSentenceRepository.deleteById(sentenceId);
    }

    // ==========================================
    // --- CHẤM ĐIỂM CÂU LUYỆN NÓI (SENTENCE) ---
    // ==========================================
    public StudyRecord submitSentenceScore(Long sentenceId, Map<String, Object> payload, int duration) {
        SpeakingSentence sentence = speakingSentenceRepository.findById(sentenceId).orElseThrow();

        float clientScore = 0f;
        if (payload.get("score") != null) {
            try {
                clientScore = Float.parseFloat(payload.get("score").toString());
            } catch (NumberFormatException ignored) {}
        }

        String transcript = payload.get("transcript") != null ? payload.get("transcript").toString() : "";
        float finalScore;

        if (!transcript.trim().isEmpty()) {
            float similarity = calculateSimilarity(transcript, sentence.getEnglishSentence());
            float computedScore = similarity * 100f;
            // Cho phép sai số nhận dạng giọng nói 15%, nhưng chặn vượt ngưỡng vô lý từ client
            finalScore = Math.min(clientScore, computedScore + 15f);
            finalScore = Math.max(0f, Math.min(100f, finalScore));
        } else {
            finalScore = Math.min(clientScore, 50f);
        }

        finalScore = Math.round(finalScore * 10.0f) / 10.0f;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("SPEAKING"); 
        record.setRefId(sentenceId);
        record.setScore(finalScore);
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        // Tự động cập nhật chuỗi ngày học Streak
        streakService.updateStreakProgress(user, "SPEAKING", sentenceId);

        return savedRecord;
    }

    // --- LOGIC CHẤM ĐIỂM CŨ (GIỮ TƯƠNG THÍCH NẾU CÒN DÙNG) ---
    public StudyRecord submitSpeakingScore(Long lessonId, Map<String, Object> payload, int duration) {
        SpeakingLesson lesson = speakingLessonRepository.findById(lessonId).orElseThrow();

        float clientScore = 0f;
        if (payload.get("score") != null) {
            try {
                clientScore = Float.parseFloat(payload.get("score").toString());
            } catch (NumberFormatException ignored) {}
        }

        String transcript = payload.get("transcript") != null ? payload.get("transcript").toString() : "";
        float finalScore;

        if (!transcript.trim().isEmpty()) {
            float similarity = calculateSimilarity(transcript, lesson.getContent());
            float computedScore = similarity * 100f;
            finalScore = Math.min(clientScore, computedScore + 15f);
            finalScore = Math.max(0f, Math.min(100f, finalScore));
        } else {
            finalScore = Math.min(clientScore, 50f);
        }

        finalScore = Math.round(finalScore * 10.0f) / 10.0f;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("SPEAKING"); 
        record.setRefId(lessonId);
        record.setScore(finalScore);
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        streakService.updateStreakProgress(user, "SPEAKING", lessonId);

        return savedRecord;
    }

    // --- TIỆN ÍCH SO KHỚP VĂN BẢN (LEVENSHTEIN SIMILARITY) ---
    private float calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0f;
        // Khử các từ đệm phổ biến (um, uh, ah, er, like) và chuẩn hóa khoảng trắng
        String clean1 = s1.trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\b(um|uh|ah|er|like)\\b", "").replaceAll("\\s+", " ").trim();
        String clean2 = s2.trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "").replaceAll("\\s+", " ").trim();

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

    // --- LOGIC CŨ CHO ADMIN (CRUD BÀI CŨ) ---
    public SpeakingLesson createLesson(Long classId, String title, String content) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        SpeakingLesson lesson = new SpeakingLesson();
        lesson.setTitle(title);
        lesson.setContent(content);
        lesson.setStudentClass(studentClass);
        return speakingLessonRepository.save(lesson);
    }

    public List<SpeakingLesson> getAllLessonsByClass(Long classId) {
        return speakingLessonRepository.findByStudentClassId(classId);
    }

    public void deleteLesson(Long lessonId) {
        speakingLessonRepository.deleteById(lessonId);
    }
}