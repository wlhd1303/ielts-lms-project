package com.ielts.lms.service;

import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MockTestService {

    private final MockTestRepository mockTestRepository;
    private final MockQuestionRepository mockQuestionRepository;
    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService;
    private final UserMockVocabRepository userMockVocabRepository;
    private final VocabWordRepository vocabWordRepository;

    private static final List<String> FALLBACK_MEANINGS = List.of(
            "Khả năng", "Môi trường", "Thách thức", "Phát triển",
            "Giải pháp", "Mục tiêu", "Ảnh hưởng", "Nghiên cứu",
            "Cơ hội", "Kinh nghiệm", "Trách nhiệm", "Thành công",
            "Phương pháp", "Tác động", "Quan điểm", "Hệ thống"
    );

    public MockTestService(MockTestRepository mockTestRepository, 
                           MockQuestionRepository mockQuestionRepository, 
                           StudyRecordRepository studyRecordRepository, 
                           UserRepository userRepository,
                           StudentClassRepository studentClassRepository,
                           StreakService streakService,
                           UserMockVocabRepository userMockVocabRepository,
                           VocabWordRepository vocabWordRepository) {
        this.mockTestRepository = mockTestRepository;
        this.mockQuestionRepository = mockQuestionRepository;
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
        this.userMockVocabRepository = userMockVocabRepository;
        this.vocabWordRepository = vocabWordRepository;
    }

    // --- LẤY DỮ LIỆU ĐỂ HIỂN THỊ (HỌC VIÊN) ---
    public List<MockTest> getTestsByClass(Long classId) {
        return mockTestRepository.findByStudentClassId(classId);
    }

    public MockTest getTestById(Long testId) {
        return mockTestRepository.findById(testId).orElseThrow();
    }

    // --- CRUD DÀNH CHO ADMIN ---
    public MockTest createTest(Long classId, MockTest mockTest) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        mockTest.setStudentClass(studentClass);
        return mockTestRepository.save(mockTest);
    }

    public void deleteTest(Long testId) {
        mockTestRepository.deleteById(testId);
    }

    public void saveAnswerKey(Long testId, List<MockQuestion> questions) {
        MockTest test = mockTestRepository.findById(testId).orElseThrow();
        mockQuestionRepository.deleteAll(mockQuestionRepository.findByMockTestId(testId));
        
        for (MockQuestion q : questions) {
            q.setMockTest(test);
        }
        mockQuestionRepository.saveAll(questions);
    }

    // --- HÀM CHẤM ĐIỂM ĐỀ THI MOCK (HỖ TRỢ NHIỀU ĐÁP ÁN ĐÚNG: A/C/B, centre/center, 10/ten) ---
    public StudyRecord gradeMockTest(Long testId, Map<Integer, String> studentAnswers, int duration) {
        List<MockQuestion> correctAnswers = mockQuestionRepository.findByMockTestId(testId);
        int correctCount = 0;

        for (MockQuestion q : correctAnswers) {
            String studentAns = studentAnswers != null ? studentAnswers.get(q.getQuestionNumber()) : null;
            String rawCorrectAnswer = q.getCorrectAnswer();

            if (studentAns != null && rawCorrectAnswer != null) {
                // Khử dấu câu thừa ở hai đầu câu trả lời của học viên (ví dụ: "center." -> "center")
                String cleanStudentAns = studentAns.trim().toLowerCase().replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "");

                // Tách các đáp án đúng bằng dấu gạch chéo '/' hoặc dấu gạch đứng '|' (không tách bằng dấu phẩy để bảo vệ số 10,000)
                String[] acceptableAnswers = rawCorrectAnswer.split("[/|]");
                boolean isMatched = false;

                for (String ans : acceptableAnswers) {
                    String cleanAns = ans.trim().toLowerCase().replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "");
                    if (cleanStudentAns.equalsIgnoreCase(cleanAns)) {
                        isMatched = true;
                        break;
                    }
                }

                if (isMatched) {
                    correctCount++;
                }
            }
        }
        
        float score = 0;
        if (!correctAnswers.isEmpty()) {
            score = (float) correctCount / correctAnswers.size() * 100;
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("MOCK_TEST"); 
        record.setRefId(testId);
        record.setScore(Math.round(score * 10.0) / 10.0);
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        // TỰ ĐỘNG CẬP NHẬT STREAK VÀ LOG LƯU VÀO CSDL
        streakService.updateStreakProgress(user, "MOCK_TEST", testId);

        return savedRecord;
    }

    // ⚡ 1. TÍNH NĂNG MỚI: LƯU TỪ 5 TỚI 10 TỪ VỰNG SAU BÀI READING
    public void saveExtractedVocabularies(Long testId, List<Map<String, String>> vocabList) {
        if (vocabList == null || vocabList.size() < 5 || vocabList.size() > 10) {
            throw new RuntimeException("Số lượng từ vựng bắt buộc từ 5 đến 10 từ!");
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        MockTest test = mockTestRepository.findById(testId).orElseThrow();

        List<UserMockVocab> entities = new ArrayList<>();
        for (Map<String, String> item : vocabList) {
            String english = item.get("englishWord");
            String vietnamese = item.get("vietnameseMeaning");

            if (english != null && !english.trim().isEmpty() && vietnamese != null && !vietnamese.trim().isEmpty()) {
                UserMockVocab vocab = new UserMockVocab();
                vocab.setUser(user);
                vocab.setMockTest(test);
                vocab.setEnglishWord(english.trim());
                vocab.setVietnameseMeaning(vietnamese.trim());
                vocab.setTested(false);
                entities.add(vocab);
            }
        }
        userMockVocabRepository.saveAll(entities);
    }

    // ⚡ 2. TÍNH NĂNG MỚI: LẤY CÂU HỎI TRẮC NGHIỆM TỪ VỰNG CHƯA TEST CHO BÀI MOCK TIẾP THEO
    public List<Map<String, Object>> getPendingVocabularyQuiz() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        List<UserMockVocab> pendingVocabs = userMockVocabRepository.findByUserIdAndIsTestedFalse(user.getId());
        if (pendingVocabs.isEmpty()) {
            return Collections.emptyList();
        }

        List<VocabWord> allVocabWords = vocabWordRepository.findAll();
        List<String> allMeanings = allVocabWords.stream()
                .map(VocabWord::getVietnameseMeaning)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (allMeanings.size() < 10) {
            allMeanings.addAll(List.of("Khả năng", "Sự phát triển", "Môi trường", "Thách thức", "Giải pháp", "Kết quả", "Tác động", "Phương pháp"));
        }

        List<Map<String, Object>> quizList = new ArrayList<>();
        Random random = new Random();

        for (UserMockVocab item : pendingVocabs) {
            Map<String, Object> quizMap = new HashMap<>();
            quizMap.put("id", item.getId());
            quizMap.put("englishWord", item.getEnglishWord());
            quizMap.put("correctAnswer", item.getVietnameseMeaning());

            Set<String> optionsSet = new HashSet<>();
            optionsSet.add(item.getVietnameseMeaning());

            List<String> otherMeanings = allMeanings.stream()
                    .filter(m -> m != null && !m.trim().equalsIgnoreCase(item.getVietnameseMeaning().trim()))
                    .distinct()
                    .collect(Collectors.toList());
            Collections.shuffle(otherMeanings);
            for (String otherMeaning : otherMeanings) {
                if (optionsSet.size() >= 4) break;
                optionsSet.add(otherMeaning);
            }

            // Nếu vẫn chưa đủ 4 lựa chọn (do trích xuất ít từ hoặc có từ đồng nghĩa), bù bằng nghĩa dự phòng
            if (optionsSet.size() < 4) {
                List<String> fallbackShuffled = new ArrayList<>(FALLBACK_MEANINGS);
                Collections.shuffle(fallbackShuffled);
                for (String fb : fallbackShuffled) {
                    if (optionsSet.size() >= 4) break;
                    if (!fb.trim().equalsIgnoreCase(item.getVietnameseMeaning().trim())) {
                        optionsSet.add(fb);
                    }
                }
            }

            List<String> optionsList = new ArrayList<>(optionsSet);
            Collections.shuffle(optionsList);

            quizMap.put("options", optionsList);
            quizList.add(quizMap);
        }

        return quizList;
    }

    // ⚡ 3. NỘP BÀI TEST TỪ VỰNG ÔN TẬP
    public StudyRecord submitVocabTest(float score, int durationSeconds) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        List<UserMockVocab> pendingVocabs = userMockVocabRepository.findByUserIdAndIsTestedFalse(user.getId());
        for (UserMockVocab v : pendingVocabs) {
            v.setTested(true);
        }
        userMockVocabRepository.saveAll(pendingVocabs);

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("READING_VOCAB_TEST");
        record.setRefId(0L);
        record.setScore(score);
        record.setDurationSeconds(durationSeconds);
        StudyRecord savedRecord = studyRecordRepository.save(record);

        streakService.updateStreakProgress(user, "VOCAB", 0L);

        return savedRecord;
    }

    // ⚡ 4. TÍNH NĂNG MỚI: LẤY DANH SÁCH TỪ VỰNG REVIEW THEO ID BÀI READING
    public List<Map<String, Object>> getExtractedWordsByTestId(Long testId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        List<UserMockVocab> vocabs = userMockVocabRepository.findByUserId(user.getId());
        
        return vocabs.stream()
                .filter(v -> v.getMockTest() != null && v.getMockTest().getId().equals(testId))
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", v.getId());
                    map.put("englishWord", v.getEnglishWord());
                    map.put("vietnameseMeaning", v.getVietnameseMeaning());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public List<MockQuestion> getAnswers(Long testId) {
        return mockQuestionRepository.findByMockTestId(testId);
    }

    public List<Map<String, Object>> getQuestionsForStudent(Long testId) {
        List<MockQuestion> questions = mockQuestionRepository.findByMockTestId(testId);
        return questions.stream().map(q -> {
            Map<String, Object> map = new HashMap<>();
            map.put("questionNumber", q.getQuestionNumber());
            map.put("questionText", q.getQuestionText());
            return map;
        }).collect(Collectors.toList());
    }
}