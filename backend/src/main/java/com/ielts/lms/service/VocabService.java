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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class VocabService {

    private final VocabTopicRepository vocabTopicRepository;
    private final VocabWordRepository vocabWordRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService;

    private static final List<String> FALLBACK_MEANINGS = List.of(
            "Khả năng", "Môi trường", "Thách thức", "Phát triển",
            "Giải pháp", "Mục tiêu", "Ảnh hưởng", "Nghiên cứu",
            "Cơ hội", "Kinh nghiệm", "Trách nhiệm", "Thành công",
            "Phương pháp", "Tác động", "Quan điểm", "Hệ thống"
    );

    public VocabService(VocabTopicRepository vocabTopicRepository, 
                        VocabWordRepository vocabWordRepository, 
                        StudyRecordRepository studyRecordRepository, 
                        UserRepository userRepository, 
                        StudentClassRepository studentClassRepository,
                        StreakService streakService) {
        this.vocabTopicRepository = vocabTopicRepository;
        this.vocabWordRepository = vocabWordRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    public List<VocabTopic> getTopicsByClass(Long classId) {
        return vocabTopicRepository.findByStudentClassId(classId);
    }

    public List<VocabWord> getWordsByTopic(Long topicId) {
        return vocabWordRepository.findByTopicId(topicId);
    }

    public List<Map<String, Object>> getQuizByTopic(Long topicId) {
        List<VocabWord> words = vocabWordRepository.findByTopicId(topicId);
        List<Map<String, Object>> quizList = new ArrayList<>();
        for (VocabWord word : words) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", word.getId());
            map.put("englishWord", word.getEnglishWord());
            map.put("audioUrl", word.getAudioUrl());
            map.put("vietnameseMeaning", word.getVietnameseMeaning() != null ? word.getVietnameseMeaning().trim() : "");
            
            List<String> options = new ArrayList<>();
            if (word.getVietnameseMeaning() != null && !word.getVietnameseMeaning().trim().isEmpty()) {
                options.add(word.getVietnameseMeaning().trim());
            }
            if (word.getWrongOption1() != null && !word.getWrongOption1().trim().isEmpty()) {
                options.add(word.getWrongOption1().trim());
            }
            if (word.getWrongOption2() != null && !word.getWrongOption2().trim().isEmpty()) {
                options.add(word.getWrongOption2().trim());
            }
            if (word.getWrongOption3() != null && !word.getWrongOption3().trim().isEmpty()) {
                options.add(word.getWrongOption3().trim());
            }

            // Nếu chưa đủ 4 lựa chọn (do thiếu wrong options), bù bằng nghĩa dự phòng
            if (options.size() < 4) {
                List<String> fallbackShuffled = new ArrayList<>(FALLBACK_MEANINGS);
                Collections.shuffle(fallbackShuffled);
                for (String fb : fallbackShuffled) {
                    if (options.size() >= 4) break;
                    String meaning = word.getVietnameseMeaning() != null ? word.getVietnameseMeaning().trim() : "";
                    if (!fb.equalsIgnoreCase(meaning) && !options.contains(fb)) {
                        options.add(fb);
                    }
                }
            }

            Collections.shuffle(options);
            map.put("options", options);
            quizList.add(map);
        }
        return quizList;
    }

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

    public Map<String, Object> gradeVocabTest(Long topicId, Map<Long, String> userAnswers, int duration) {
        List<VocabWord> words = vocabWordRepository.findByTopicId(topicId);
        int correctCount = 0;

        for (VocabWord word : words) {
            String ans = userAnswers != null ? userAnswers.get(word.getId()) : null;
            if (ans != null && word.getVietnameseMeaning() != null && ans.trim().equalsIgnoreCase(word.getVietnameseMeaning().trim())) {
                correctCount++;
            }
        }

        // Chuẩn hóa sang thang điểm 100% đồng nhất cho Bảng xếp hạng (Leaderboard)
        float scorePercentage = words.isEmpty() ? 0 : ((float) correctCount / words.size() * 100f);
        double roundedScore = Math.round(scorePercentage * 10.0) / 10.0;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("VOCAB");
        record.setRefId(topicId);
        record.setScore(roundedScore); 
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        streakService.updateStreakProgress(user, "VOCAB", topicId);

        Map<String, Object> result = new HashMap<>();
        result.put("id", savedRecord.getId());
        result.put("score", savedRecord.getScore());
        result.put("correctCount", correctCount);
        result.put("totalQuestions", words.size());
        result.put("durationSeconds", savedRecord.getDurationSeconds());
        result.put("record", savedRecord);

        return result;
    }

    // ⚡ ĐÃ SỬA: TRUYỀN ĐÚNG MODULE TYPE "LISTENING_VOCAB_TEST" ĐỂ TÍNH STREAK
    public StudyRecord submitListeningVocabScore(Long topicId, float score, int duration) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("LISTENING_VOCAB_TEST");
        record.setRefId(topicId);
        record.setScore(score);
        record.setDurationSeconds(duration);

        StudyRecord savedRecord = studyRecordRepository.save(record);

        // Cập nhật chuỗi Streak bài tập khớp với moduleType trong StreakService
        streakService.updateStreakProgress(user, "LISTENING_VOCAB_TEST", topicId);

        return savedRecord;
    }
}