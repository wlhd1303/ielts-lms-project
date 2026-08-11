package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WritingService {

    private final WritingTopicRepository writingTopicRepository;
    private final WritingPromptRepository writingPromptRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService; // 👈 1. INJECT STREAK SERVICE

    public WritingService(WritingTopicRepository writingTopicRepository, 
                          WritingPromptRepository writingPromptRepository, 
                          StudyRecordRepository studyRecordRepository, 
                          UserRepository userRepository, 
                          StudentClassRepository studentClassRepository,
                          StreakService streakService) { // 👈 2. BỔ SUNG VÀO CONSTRUCTOR
        this.writingTopicRepository = writingTopicRepository;
        this.writingPromptRepository = writingPromptRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    public List<WritingTopic> getTopicsByClass(Long classId) {
        return writingTopicRepository.findByStudentClassId(classId);
    }

    public WritingTopic createTopic(Long classId, String topicName) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        WritingTopic topic = new WritingTopic();
        topic.setName(topicName);
        topic.setStudentClass(studentClass);
        return writingTopicRepository.save(topic);
    }

    public void deleteTopic(Long topicId) {
        writingTopicRepository.deleteById(topicId);
    }

    public List<WritingPrompt> getPromptsByTopic(Long topicId) {
        return writingPromptRepository.findByTopicId(topicId);
    }

    public WritingPrompt createPrompt(Long topicId, WritingPrompt prompt) {
        WritingTopic topic = writingTopicRepository.findById(topicId).orElseThrow();
        prompt.setTopic(topic);
        return writingPromptRepository.save(prompt);
    }

    public void deletePrompt(Long promptId) {
        writingPromptRepository.deleteById(promptId);
    }

    // =========================================================================
    // 🔥 THUẬT TOÁN CHẤM ĐIỂM WRITING NÂNG CẤP (TỪ KHÓA + NGỮ PHÁP + ĐỘ DÀI)
    // =========================================================================
    public StudyRecord gradeWriting(Long promptId, String userAnswer, int duration) {
        WritingPrompt prompt = writingPromptRepository.findById(promptId).orElseThrow();
        
        String cleanUserAns = userAnswer == null ? "" : userAnswer.trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "");
        String cleanCorrectAns = prompt.getEnglishAnswer() == null ? "" : prompt.getEnglishAnswer().trim().toLowerCase().replaceAll("[^a-z0-9\\s]", "");
        String keywordsStr = prompt.getKeywords();

        // 1. CHẤM TỪ KHÓA (Tối đa 40 điểm)
        float keywordScore = 0;
        if (keywordsStr != null && !keywordsStr.trim().isEmpty()) {
            String[] keywords = keywordsStr.split(",");
            int matchedCount = 0;
            for (String kw : keywords) {
                if (cleanUserAns.contains(kw.trim().toLowerCase())) {
                    matchedCount++;
                }
            }
            keywordScore = ((float) matchedCount / keywords.length) * 40f;
        } else {
            keywordScore = 40f; // Nếu không có keyword thì bỏ qua tiêu chí này
        }

        // 2. CHẤM CẤU TRÚC / NGỮ PHÁP BẰNG N-GRAM SIMILARITY (Tối đa 40 điểm)
        float similarityScore = calculateSimilarity(cleanUserAns, cleanCorrectAns) * 40f;

        // 3. CHẤM ĐỘ DÀI VÀ TRẬT TỰ CÂU (Tối đa 20 điểm)
        float lengthPenaltyScore = calculateLengthPenalty(cleanUserAns, cleanCorrectAns) * 20f;

        // TỔNG ĐIỂM (Tối đa 100%)
        float totalScore = keywordScore + similarityScore + lengthPenaltyScore;
        totalScore = Math.min(100f, Math.max(0f, totalScore)); // Bọc trong khoảng 0 - 100%

        // Lưu lịch sử
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("WRITING"); 
        record.setRefId(promptId);
        record.setScore(Math.round(totalScore * 10.0) / 10.0); // Làm tròn 1 chữ số thập phân
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        // ⚡ 3. TỰ ĐỘNG CẬP NHẬT STREAK VÀ LOG LƯU VÀO CSDL
        streakService.updateStreakProgress(user, "WRITING", promptId);

        return savedRecord;
    }

    // --- HÀM PHỤ: TÍNH ĐỘ TƯƠNG ĐỒNG CẤU TRÚC (LEVENSHTEIN DISTANCE) ---
    private float calculateSimilarity(String s1, String s2) {
        if (s1.isEmpty() && s2.isEmpty()) return 1.0f;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0f;

        int distance = computeLevenshteinDistance(s1, s2);
        int maxLength = Math.max(s1.length(), s2.length());
        
        return 1.0f - ((float) distance / maxLength);
    }

    private int computeLevenshteinDistance(String lhs, String rhs) {
        int[] costs = new int[rhs.length() + 1];
        for (int j = 0; j <= rhs.length(); j++) costs[j] = j;
        for (int i = 1; i <= lhs.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= rhs.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), 
                        lhs.charAt(i - 1) == rhs.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[rhs.length()];
    }

    // --- HÀM PHỤ: CHẤM TỶ LỆ TỪ/ĐỘ DÀI CÂU ---
    private float calculateLengthPenalty(String userAns, String correctAns) {
        String[] userWords = userAns.split("\\s+");
        String[] correctWords = correctAns.split("\\s+");

        if (userWords.length == 0 || correctWords.length == 0) return 0f;

        float ratio = (float) userWords.length / correctWords.length;
        if (ratio >= 0.8f && ratio <= 1.3f) {
            return 1.0f; // Độ dài hoàn hảo
        } else if (ratio >= 0.5f && ratio <= 1.5f) {
            return 0.6f; // Hơi ngắn hoặc hơi dài
        } else {
            return 0.2f; // Thiếu vế nghiêm trọng hoặc gõ thừa từ
        }
    }
}