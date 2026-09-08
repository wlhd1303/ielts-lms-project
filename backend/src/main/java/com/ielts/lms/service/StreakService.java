package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StreakService {

    private final UserStreakRepository userStreakRepository;
    private final UserStreakLogRepository userStreakLogRepository;
    private final StudyRecordRepository studyRecordRepository;
    
    private final DictationTopicRepository dictationTopicRepository;
    private final DictationAudioRepository dictationAudioRepository;
    private final VocabTopicRepository vocabTopicRepository;
    private final SpeakingLessonRepository speakingLessonRepository;
    private final SpeakingTopicRepository speakingTopicRepository;
    private final SpeakingSentenceRepository speakingSentenceRepository;
    private final WritingTopicRepository writingTopicRepository;
    private final WritingPromptRepository writingPromptRepository;
    private final MockTestRepository mockTestRepository;

    public StreakService(UserStreakRepository userStreakRepository,
                          UserStreakLogRepository userStreakLogRepository,
                          StudyRecordRepository studyRecordRepository,
                          DictationTopicRepository dictationTopicRepository,
                          DictationAudioRepository dictationAudioRepository,
                          VocabTopicRepository vocabTopicRepository,
                          SpeakingLessonRepository speakingLessonRepository,
                          SpeakingTopicRepository speakingTopicRepository,
                          SpeakingSentenceRepository speakingSentenceRepository,
                          WritingTopicRepository writingTopicRepository,
                          WritingPromptRepository writingPromptRepository,
                          MockTestRepository mockTestRepository) {
        this.userStreakRepository = userStreakRepository;
        this.userStreakLogRepository = userStreakLogRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.dictationTopicRepository = dictationTopicRepository;
        this.dictationAudioRepository = dictationAudioRepository;
        this.vocabTopicRepository = vocabTopicRepository;
        this.speakingLessonRepository = speakingLessonRepository;
        this.speakingTopicRepository = speakingTopicRepository;
        this.speakingSentenceRepository = speakingSentenceRepository;
        this.writingTopicRepository = writingTopicRepository;
        this.writingPromptRepository = writingPromptRepository;
        this.mockTestRepository = mockTestRepository;
    }

    public Map<String, Object> getTodayStreakExercise(User user) {
        if (user == null || user.getStudentClass() == null) {
            Map<String, Object> emptyResp = new HashMap<>();
            emptyResp.put("currentStreak", 0);
            emptyResp.put("maxStreak", 0);
            emptyResp.put("currentDayIndex", 1);
            emptyResp.put("moduleType", "DICTATION");
            emptyResp.put("exercise", null);
            emptyResp.put("completedToday", false);
            return emptyResp;
        }

        UserStreak streak = userStreakRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserStreak newStreak = new UserStreak();
                    newStreak.setUser(user);
                    return userStreakRepository.save(newStreak);
                });

        String moduleType = determineModuleType(streak.getCurrentDayIndex());
        
        List<StudyRecord> records = studyRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        Set<Long> completedRefIds = new HashSet<>();
        if (records != null) {
            completedRefIds = records.stream()
                    .filter(r -> r.getModuleType() != null && r.getModuleType().equalsIgnoreCase(moduleType)
                              && r.getRefId() != null)
                    .map(StudyRecord::getRefId)
                    .collect(Collectors.toSet());
        }

        Long classId = user.getStudentClass().getId();
        Object exercisePayload = null;
        final Set<Long> doneIds = completedRefIds;
        
        switch (moduleType) {
            case "DICTATION":
                List<DictationTopic> dTopics = dictationTopicRepository.findByStudentClassId(classId);
                if (dTopics != null && !dTopics.isEmpty()) {
                    List<Long> topicIds = dTopics.stream().map(DictationTopic::getId).toList();
                    List<DictationAudio> dAudios = dictationAudioRepository.findByTopicIdIn(topicIds);
                    if (dAudios != null) {
                        exercisePayload = dAudios.stream()
                                .filter(a -> !doneIds.contains(a.getId()))
                                .min(Comparator.comparing(DictationAudio::getId)).orElse(null);
                    }
                }
                break;
            case "VOCAB":
                List<VocabTopic> vTopics = vocabTopicRepository.findByStudentClassId(classId);
                if (vTopics != null) {
                    exercisePayload = vTopics.stream()
                            .filter(t -> !doneIds.contains(t.getId()))
                            .min(Comparator.comparing(VocabTopic::getId)).orElse(null);
                }
                break;
            case "LISTENING_VOCAB_TEST":
            case "LISTENING_VOCAB":
                // ⚡ Bổ sung quét bài tập Phản xạ Listening Vocab qua kho từ vựng của lớp
                List<VocabTopic> lvTopics = vocabTopicRepository.findByStudentClassId(classId);
                if (lvTopics != null) {
                    exercisePayload = lvTopics.stream()
                            .filter(t -> !doneIds.contains(t.getId()))
                            .min(Comparator.comparing(VocabTopic::getId)).orElse(null);
                }
                break;
            case "SPEAKING":
                List<SpeakingTopic> sTopics = speakingTopicRepository.findByStudentClassId(classId);
                if (sTopics != null && !sTopics.isEmpty()) {
                    List<Long> topicIds = sTopics.stream().map(SpeakingTopic::getId).toList();
                    List<SpeakingSentence> sSentences = speakingSentenceRepository.findByTopicIdIn(topicIds);
                    if (sSentences != null) {
                        exercisePayload = sSentences.stream()
                                .filter(s -> !doneIds.contains(s.getId()))
                                .min(Comparator.comparing(SpeakingSentence::getId)).orElse(null);
                    }
                }
                // Dự phòng cho các lớp cũ nếu chưa chuyển sang cấu trúc Topic
                if (exercisePayload == null) {
                    List<SpeakingLesson> sLessons = speakingLessonRepository.findByStudentClassId(classId);
                    if (sLessons != null) {
                        exercisePayload = sLessons.stream()
                                .filter(l -> !doneIds.contains(l.getId()))
                                .min(Comparator.comparing(SpeakingLesson::getId)).orElse(null);
                    }
                }
                break;
            case "WRITING":
                List<WritingTopic> wTopics = writingTopicRepository.findByStudentClassId(classId);
                if (wTopics != null && !wTopics.isEmpty()) {
                    List<Long> topicIds = wTopics.stream().map(WritingTopic::getId).toList();
                    List<WritingPrompt> wPrompts = writingPromptRepository.findByTopicIdIn(topicIds);
                    if (wPrompts != null) {
                        exercisePayload = wPrompts.stream()
                                .filter(p -> !doneIds.contains(p.getId()))
                                .min(Comparator.comparing(WritingPrompt::getId)).orElse(null);
                    }
                }
                break;
            case "MOCK_TEST":
                List<MockTest> mTests = mockTestRepository.findByStudentClassId(classId);
                if (mTests != null) {
                    exercisePayload = mTests.stream()
                            .filter(m -> !doneIds.contains(m.getId()))
                            .min(Comparator.comparing(MockTest::getId)).orElse(null);
                }
                break;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("currentStreak", streak.getCurrentStreak());
        response.put("maxStreak", streak.getMaxStreak());
        response.put("currentDayIndex", streak.getCurrentDayIndex());
        response.put("moduleType", moduleType);
        response.put("exercise", exercisePayload);
        
        boolean hasDoneToday = false;
        if (streak.getLastCompletedAt() != null) {
            hasDoneToday = streak.getLastCompletedAt().toLocalDate().equals(LocalDate.now());
        }
        response.put("completedToday", hasDoneToday);

        return response;
    }

    @Transactional
    public void updateStreakProgress(User user, String moduleType, Long refId) {
        if (user == null) return;

        UserStreak streak = userStreakRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserStreak newStreak = new UserStreak();
                    newStreak.setUser(user);
                    return userStreakRepository.save(newStreak);
                });

        if (streak.getLastCompletedAt() != null && streak.getLastCompletedAt().toLocalDate().equals(LocalDate.now())) {
            return;
        }

        String requiredModule = determineModuleType(streak.getCurrentDayIndex());
        if (!requiredModule.equalsIgnoreCase(moduleType)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        
        if (streak.getLastCompletedAt() == null) {
            streak.setCurrentStreak(1);
        } else {
            LocalDate lastDate = streak.getLastCompletedAt().toLocalDate();
            LocalDate today = LocalDate.now();
            if (lastDate.plusDays(1).equals(today)) {
                streak.setCurrentStreak(streak.getCurrentStreak() + 1);
            } else if (!lastDate.equals(today)) {
                streak.setCurrentStreak(1);
            }
        }

        if (streak.getCurrentStreak() > streak.getMaxStreak()) {
            streak.setMaxStreak(streak.getCurrentStreak());
        }

        UserStreakLog log = new UserStreakLog();
        log.setUser(user);
        log.setDayIndex(streak.getCurrentDayIndex());
        log.setModuleType(moduleType);
        log.setRefId(refId);
        log.setCompletedAt(now);
        userStreakLogRepository.save(log);

        streak.setLastCompletedAt(now);
        if (streak.getCurrentDayIndex() < 80) {
            streak.setCurrentDayIndex(streak.getCurrentDayIndex() + 1);
        }

        userStreakRepository.save(streak);
    }

    public List<Map<String, Object>> getAdminStreakDashboard() {
        List<UserStreak> allStreaks = userStreakRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (UserStreak us : allStreaks) {
            if (us.getUser() == null || "ROLE_ADMIN".equals(us.getUser().getRole())) continue;
            
            Map<String, Object> map = new HashMap<>();
            map.put("username", us.getUser().getUsername());
            map.put("className", us.getUser().getStudentClass() != null ? us.getUser().getStudentClass().getName() : "Chưa xếp lớp");
            map.put("currentStreak", us.getCurrentStreak());
            map.put("currentDayIndex", us.getCurrentDayIndex());
            
            boolean doneToday = us.getLastCompletedAt() != null && us.getLastCompletedAt().toLocalDate().equals(today);
            map.put("completedToday", doneToday);
            map.put("lastActive", us.getLastCompletedAt() != null ? us.getLastCompletedAt().toString() : "Chưa từng làm");

            result.add(map);
        }
        return result;
    }

    // ⚡ VÒNG XOAY TUA CẬP NHẬT THÀNH CHU KỲ 6 KỸ NĂNG (DAY % 6)
    private String determineModuleType(int dayIndex) {
        int pattern = dayIndex % 6;
        switch (pattern) {
            case 1: return "DICTATION";
            case 2: return "VOCAB";
            case 3: return "LISTENING_VOCAB_TEST"; // ⚡ Thêm Phản xạ Listening
            case 4: return "SPEAKING";
            case 5: return "WRITING";
            case 0:
            default: return "MOCK_TEST";
        }
    }
}