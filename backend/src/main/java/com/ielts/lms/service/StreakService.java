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
    private final StudyCycleRepository studyCycleRepository;

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
                          MockTestRepository mockTestRepository,
                          StudyCycleRepository studyCycleRepository) {
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
        this.studyCycleRepository = studyCycleRepository;
    }

    public static class CycleStep {
        public StudyCycle cycle;
        public String moduleType;
        public Long refId;
        public Object payload;
        public boolean isMock;

        public CycleStep(StudyCycle cycle, String moduleType, Long refId, Object payload, boolean isMock) {
            this.cycle = cycle;
            this.moduleType = moduleType;
            this.refId = refId;
            this.payload = payload;
            this.isMock = isMock;
        }
    }

    private List<CycleStep> buildStepsForCycle(StudyCycle cycle) {
        List<CycleStep> steps = new ArrayList<>();
        boolean isReading = "READING".equalsIgnoreCase(cycle.getCycleType());

        // 1. DICTATION: Chỉ có ở VÒNG LISTENING, VÒNG READING TỰ ĐỘNG BỎ QUA (SKIP)
        if (!isReading && cycle.getDictationAudio() != null) {
            steps.add(new CycleStep(cycle, "DICTATION", cycle.getDictationAudio().getId(), cycle.getDictationAudio(), false));
        }

        // 2. VOCAB: Từ vựng chuẩn bị cho đề
        if (cycle.getVocabTopic() != null) {
            steps.add(new CycleStep(cycle, "VOCAB", cycle.getVocabTopic().getId(), cycle.getVocabTopic(), false));
        }

        // 3. SPEAKING: Luyện nói liên quan
        if (cycle.getSpeakingTopic() != null) {
            List<SpeakingSentence> sentences = speakingSentenceRepository.findByTopicIdIn(List.of(cycle.getSpeakingTopic().getId()));
            Object spkPayload = (sentences != null && !sentences.isEmpty()) ? sentences.get(0) : cycle.getSpeakingTopic();
            Long spkRefId = (sentences != null && !sentences.isEmpty()) ? sentences.get(0).getId() : cycle.getSpeakingTopic().getId();
            steps.add(new CycleStep(cycle, "SPEAKING", spkRefId, spkPayload, false));
        }

        // 4. WRITING: Dịch câu liên quan
        if (cycle.getWritingTopic() != null) {
            List<WritingPrompt> prompts = writingPromptRepository.findByTopicIdIn(List.of(cycle.getWritingTopic().getId()));
            Object wrtPayload = (prompts != null && !prompts.isEmpty()) ? prompts.get(0) : cycle.getWritingTopic();
            Long wrtRefId = (prompts != null && !prompts.isEmpty()) ? prompts.get(0).getId() : cycle.getWritingTopic().getId();
            steps.add(new CycleStep(cycle, "WRITING", wrtRefId, wrtPayload, false));
        }

        // 5. MOCK_TEST: Đề thi thử đích ở cuối vòng
        if (cycle.getMockTest() != null) {
            steps.add(new CycleStep(cycle, "MOCK_TEST", cycle.getMockTest().getId(), cycle.getMockTest(), true));
        }

        return steps;
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

        Long classId = user.getStudentClass().getId();
        boolean hasDoneToday = false;
        if (streak.getLastCompletedAt() != null) {
            hasDoneToday = streak.getLastCompletedAt().toLocalDate().equals(LocalDate.now());
        }

        // Lấy tất cả bản ghi học tập của học viên
        List<StudyRecord> records = studyRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        Set<String> completedKeys = new HashSet<>();
        if (records != null) {
            for (StudyRecord r : records) {
                if (r.getModuleType() != null && r.getRefId() != null) {
                    completedKeys.add(r.getModuleType().toUpperCase() + "_" + r.getRefId());
                }
            }
        }

        // ⚡ 1. KIỂM TRA XEM LỚP CÓ CẤU HÌNH VÒNG HỌC TẬP (STUDY CYCLES) HAY KHÔNG
        List<StudyCycle> activeCycles = studyCycleRepository.findByStudentClassIdAndIsActiveTrueOrderByCycleOrderAsc(classId);

        if (activeCycles != null && !activeCycles.isEmpty()) {
            CycleStep currentStep = null;

            for (StudyCycle cycle : activeCycles) {
                List<CycleStep> cycleSteps = buildStepsForCycle(cycle);
                for (CycleStep step : cycleSteps) {
                    String key = step.moduleType.toUpperCase() + "_" + step.refId;
                    if (!completedKeys.contains(key)) {
                        currentStep = step;
                        break;
                    }
                }
                if (currentStep != null) {
                    break;
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("currentStreak", streak.getCurrentStreak());
            response.put("maxStreak", streak.getMaxStreak());
            response.put("currentDayIndex", streak.getCurrentDayIndex());
            response.put("completedToday", hasDoneToday);

            if (currentStep != null) {
                response.put("moduleType", currentStep.moduleType);
                response.put("exercise", currentStep.payload);
                response.put("cycleId", currentStep.cycle.getId());
                response.put("cycleTitle", currentStep.cycle.getTitle());
                response.put("cycleOrder", currentStep.cycle.getCycleOrder());
                response.put("cycleType", currentStep.cycle.getCycleType());
                response.put("isMockDay", currentStep.isMock);
                response.put("skipDictation", "READING".equalsIgnoreCase(currentStep.cycle.getCycleType()));
            } else {
                // Đã hoàn thành tất cả các vòng hiện có của lớp
                response.put("moduleType", "MOCK_TEST");
                response.put("exercise", null);
                response.put("allCyclesCompleted", true);
            }

            return response;
        }

        // ⚡ 2. DỰ PHÒNG CHO CÁC LỚP CHƯA CẤU HÌNH VÒNG (FALLBACK TO LEGACY 6-DAY PATTERN)
        final String moduleType = determineModuleType(streak.getCurrentDayIndex());
        final Set<Long> finalDoneIds = (records != null) ? records.stream()
                .filter(r -> r.getModuleType() != null && r.getModuleType().equalsIgnoreCase(moduleType)
                          && r.getRefId() != null)
                .map(StudyRecord::getRefId)
                .collect(Collectors.toSet()) : Collections.emptySet();

        Object exercisePayload = null;
        switch (moduleType) {
            case "DICTATION":
                List<DictationTopic> dTopics = dictationTopicRepository.findByStudentClassId(classId);
                if (dTopics != null && !dTopics.isEmpty()) {
                    List<Long> topicIds = dTopics.stream().map(DictationTopic::getId).toList();
                    List<DictationAudio> dAudios = dictationAudioRepository.findByTopicIdIn(topicIds);
                    if (dAudios != null) {
                        exercisePayload = dAudios.stream()
                                .filter(a -> !finalDoneIds.contains(a.getId()))
                                .min(Comparator.comparing(DictationAudio::getId)).orElse(null);
                    }
                }
                break;
            case "VOCAB":
            case "LISTENING_VOCAB_TEST":
            case "LISTENING_VOCAB":
                List<VocabTopic> vTopics = vocabTopicRepository.findByStudentClassId(classId);
                if (vTopics != null) {
                    exercisePayload = vTopics.stream()
                            .filter(t -> !finalDoneIds.contains(t.getId()))
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
                                .filter(s -> !finalDoneIds.contains(s.getId()))
                                .min(Comparator.comparing(SpeakingSentence::getId)).orElse(null);
                    }
                }
                if (exercisePayload == null) {
                    List<SpeakingLesson> sLessons = speakingLessonRepository.findByStudentClassId(classId);
                    if (sLessons != null) {
                        exercisePayload = sLessons.stream()
                                .filter(l -> !finalDoneIds.contains(l.getId()))
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
                                .filter(p -> !finalDoneIds.contains(p.getId()))
                                .min(Comparator.comparing(WritingPrompt::getId)).orElse(null);
                    }
                }
                break;
            case "MOCK_TEST":
                List<MockTest> mTests = mockTestRepository.findByStudentClassId(classId);
                if (mTests != null) {
                    exercisePayload = mTests.stream()
                            .filter(m -> !finalDoneIds.contains(m.getId()))
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

        // Kiểm tra module hợp lệ
        if (user.getStudentClass() != null) {
            Long classId = user.getStudentClass().getId();
            List<StudyCycle> activeCycles = studyCycleRepository.findByStudentClassIdAndIsActiveTrueOrderByCycleOrderAsc(classId);
            
            if (activeCycles != null && !activeCycles.isEmpty()) {
                List<StudyRecord> records = studyRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
                Set<String> completedKeys = new HashSet<>();
                if (records != null) {
                    for (StudyRecord r : records) {
                        if (r.getModuleType() != null && r.getRefId() != null) {
                            completedKeys.add(r.getModuleType().toUpperCase() + "_" + r.getRefId());
                        }
                    }
                }

                CycleStep currentStep = null;
                for (StudyCycle cycle : activeCycles) {
                    List<CycleStep> cycleSteps = buildStepsForCycle(cycle);
                    for (CycleStep step : cycleSteps) {
                        String key = step.moduleType.toUpperCase() + "_" + step.refId;
                        if (!completedKeys.contains(key)) {
                            currentStep = step;
                            break;
                        }
                    }
                    if (currentStep != null) break;
                }

                if (currentStep != null && !currentStep.moduleType.equalsIgnoreCase(moduleType)) {
                    // Chưa đúng module của ngày hôm nay trong Vòng -> không cập nhật streak
                    return;
                }
            } else {
                String requiredModule = determineModuleType(streak.getCurrentDayIndex());
                if (!requiredModule.equalsIgnoreCase(moduleType)) {
                    return;
                }
            }
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

    private String determineModuleType(int dayIndex) {
        int pattern = dayIndex % 6;
        switch (pattern) {
            case 1: return "DICTATION";
            case 2: return "VOCAB";
            case 3: return "LISTENING_VOCAB_TEST";
            case 4: return "SPEAKING";
            case 5: return "WRITING";
            case 0:
            default: return "MOCK_TEST";
        }
    }
}