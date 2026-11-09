package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.dto.EventLeaderboardDto;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventQuestion;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.entity.TestEventShift;
import com.ielts.lms.booking.repository.TestEventQuestionRepository;
import com.ielts.lms.booking.repository.TestEventRegistrationRepository;
import com.ielts.lms.booking.repository.TestEventRepository;
import com.ielts.lms.booking.repository.TestEventShiftRepository;
import com.ielts.lms.booking.service.TestEventExamService;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class EventLeaderboardComprehensiveTest {

    private TestEventRepository eventRepository;
    private TestEventShiftRepository shiftRepository;
    private TestEventRegistrationRepository registrationRepository;
    private TestEventQuestionRepository questionRepository;
    private ObjectMapper objectMapper;
    private TestEventExamService examService;

    private TestEvent testEvent;
    private TestEventShift shiftMorning;
    private TestEventShift shiftAfternoon;
    private User studentA;
    private User studentB;
    private User studentC;
    private User studentD;
    private User adminUser;
    private List<TestEventRegistration> allRegistrations;
    private List<TestEventQuestion> allQuestions;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();

        // Tạo Event mẫu
        testEvent = new TestEvent();
        testEvent.setId(1001L);
        testEvent.setTitle("Kỳ Thi Thử Kiểm Thử Bảng Xếp Hạng");
        testEvent.setEventDate(LocalDate.now());
        testEvent.setLocation("Online");
        testEvent.setExamFormat("ONLINE");
        testEvent.setSkillType("BOTH");
        testEvent.setDurationMinutes(60);
        testEvent.setStatus("OPEN");
        testEvent.setIsLeaderboardPublic(true);

        // Tạo 2 ca thi
        shiftMorning = new TestEventShift();
        shiftMorning.setId(2001L);
        shiftMorning.setTestEvent(testEvent);
        shiftMorning.setShiftName("Ca Sáng 09:00");
        shiftMorning.setStartTime("09:00");
        shiftMorning.setEndTime("11:00");
        shiftMorning.setMaxCapacity(50);

        shiftAfternoon = new TestEventShift();
        shiftAfternoon.setId(2002L);
        shiftAfternoon.setTestEvent(testEvent);
        shiftAfternoon.setShiftName("Ca Chiều 14:00");
        shiftAfternoon.setStartTime("14:00");
        shiftAfternoon.setEndTime("16:00");
        shiftAfternoon.setMaxCapacity(50);

        // Tạo các câu hỏi mẫu để test phân tích câu bẫy (Hardest questions)
        allQuestions = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            TestEventQuestion q = new TestEventQuestion();
            q.setId((long) (3000 + i));
            q.setTestEvent(testEvent);
            q.setSkill("READING");
            q.setQuestionNumber(i);
            q.setQuestionText("Reading Question " + i);
            q.setCorrectAnswer("A");
            allQuestions.add(q);
        }

        // Tạo 4 thí sinh
        studentA = new User();
        studentA.setId(101L);
        studentA.setUsername("student_a");
        studentA.setFullName("Nguyễn Văn A");
        studentA.setRole("ROLE_USER");

        studentB = new User();
        studentB.setId(102L);
        studentB.setUsername("student_b");
        studentB.setFullName("Trần Thị B");
        studentB.setRole("ROLE_USER");

        studentC = new User();
        studentC.setId(103L);
        studentC.setUsername("student_c");
        studentC.setFullName("Lê Hoàng C");
        studentC.setRole("ROLE_USER");

        studentD = new User();
        studentD.setId(104L);
        studentD.setUsername("student_d");
        studentD.setFullName("Phạm Minh D");
        studentD.setRole("ROLE_USER");

        adminUser = new User();
        adminUser.setId(999L);
        adminUser.setUsername("admin");
        adminUser.setRole("ROLE_ADMIN");

        LocalDateTime baseTime = LocalDateTime.now();

        // 1. Student A: Overall 8.5 (R: 9.0, L: 8.0), correct: 38, duration: 45 mins
        TestEventRegistration regA = new TestEventRegistration();
        regA.setId(5001L);
        regA.setShift(shiftMorning);
        regA.setUser(studentA);
        regA.setFullName(studentA.getFullName());
        regA.setStatus("ATTENDED");
        regA.setScoreReading(9.0);
        regA.setScoreListening(8.0);
        regA.setOverallScore(8.5);
        regA.setReadingCorrectCount(38);
        regA.setListeningCorrectCount(35);
        regA.setExamStartedAt(Timestamp.valueOf(baseTime.minusMinutes(45)));
        regA.setExamSubmittedAt(Timestamp.valueOf(baseTime));
        Map<String, String> ansA = Map.of(
                "READING_1", "A",
                "READING_2", "A",
                "READING_3", "A",
                "READING_4", "A",
                "READING_5", "A"
        );
        regA.setStudentAnswers(objectMapper.writeValueAsString(ansA));

        // 2. Student B: Overall 8.0 (R: 8.0, L: 8.0), correct: 36, duration: 40 mins (nhanh hơn C)
        TestEventRegistration regB = new TestEventRegistration();
        regB.setId(5002L);
        regB.setShift(shiftMorning);
        regB.setUser(studentB);
        regB.setFullName(studentB.getFullName());
        regB.setStatus("ATTENDED");
        regB.setScoreReading(8.0);
        regB.setScoreListening(8.0);
        regB.setOverallScore(8.0);
        regB.setReadingCorrectCount(36);
        regB.setListeningCorrectCount(35);
        regB.setExamStartedAt(Timestamp.valueOf(baseTime.minusMinutes(40)));
        regB.setExamSubmittedAt(Timestamp.valueOf(baseTime));
        Map<String, String> ansB = Map.of(
                "READING_1", "A",
                "READING_2", "B" /* sai */,
                "READING_3", "A",
                "READING_4", "A",
                "READING_5", "A"
        );
        regB.setStudentAnswers(objectMapper.writeValueAsString(ansB));

        // 3. Student C: Overall 8.0 (R: 8.0, L: 8.0), correct: 36, duration: 55 mins (chậm hơn B)
        TestEventRegistration regC = new TestEventRegistration();
        regC.setId(5003L);
        regC.setShift(shiftAfternoon);
        regC.setUser(studentC);
        regC.setFullName(studentC.getFullName());
        regC.setStatus("ATTENDED");
        regC.setScoreReading(8.0);
        regC.setScoreListening(8.0);
        regC.setOverallScore(8.0);
        regC.setReadingCorrectCount(36);
        regC.setListeningCorrectCount(35);
        regC.setExamStartedAt(Timestamp.valueOf(baseTime.minusMinutes(55)));
        regC.setExamSubmittedAt(Timestamp.valueOf(baseTime));
        Map<String, String> ansC = Map.of(
                "READING_1", "B" /* sai */,
                "READING_2", "B" /* sai */,
                "READING_3", "A",
                "READING_4", "A",
                "READING_5", "A"
        );
        regC.setStudentAnswers(objectMapper.writeValueAsString(ansC));

        // 4. Student D: Overall 7.0 (R: 7.0, L: 7.0), correct: 30, duration: 35 mins
        TestEventRegistration regD = new TestEventRegistration();
        regD.setId(5004L);
        regD.setShift(shiftAfternoon);
        regD.setUser(studentD);
        regD.setFullName(studentD.getFullName());
        regD.setStatus("ATTENDED");
        regD.setScoreReading(7.0);
        regD.setScoreListening(7.0);
        regD.setOverallScore(7.0);
        regD.setReadingCorrectCount(30);
        regD.setListeningCorrectCount(30);
        regD.setExamStartedAt(Timestamp.valueOf(baseTime.minusMinutes(35)));
        regD.setExamSubmittedAt(Timestamp.valueOf(baseTime));
        Map<String, String> ansD = Map.of(
                "READING_1", "B" /* sai */,
                "READING_2", "B" /* sai */,
                "READING_3", "A",
                "READING_4", "A",
                "READING_5", "A"
        );
        regD.setStudentAnswers(objectMapper.writeValueAsString(ansD));

        allRegistrations = Arrays.asList(regA, regB, regC, regD);

        // Tạo dynamic proxies cho Repositories (thuần Java JDK Proxy, không cần ByteBuddy hay Agent)
        eventRepository = (TestEventRepository) Proxy.newProxyInstance(
                TestEventRepository.class.getClassLoader(),
                new Class<?>[]{TestEventRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        return Optional.of(testEvent);
                    }
                    if ("save".equals(method.getName())) {
                        return args[0];
                    }
                    return null;
                }
        );

        shiftRepository = (TestEventShiftRepository) Proxy.newProxyInstance(
                TestEventShiftRepository.class.getClassLoader(),
                new Class<?>[]{TestEventShiftRepository.class},
                (proxy, method, args) -> null
        );

        registrationRepository = (TestEventRegistrationRepository) Proxy.newProxyInstance(
                TestEventRegistrationRepository.class.getClassLoader(),
                new Class<?>[]{TestEventRegistrationRepository.class},
                (proxy, method, args) -> {
                    if ("findByShiftTestEventId".equals(method.getName())) {
                        return allRegistrations;
                    }
                    return null;
                }
        );

        questionRepository = (TestEventQuestionRepository) Proxy.newProxyInstance(
                TestEventQuestionRepository.class.getClassLoader(),
                new Class<?>[]{TestEventQuestionRepository.class},
                (proxy, method, args) -> {
                    if ("findByTestEventIdOrderBySkillAscQuestionNumberAsc".equals(method.getName())) {
                        return allQuestions;
                    }
                    return null;
                }
        );

        examService = new TestEventExamService(
                eventRepository,
                shiftRepository,
                registrationRepository,
                questionRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("Test 1: Thứ hạng chuẩn xác (Overall & Tie-breaker duration)")
    void testRankingsAndTieBreaker() {
        EventLeaderboardDto leaderboard = examService.getEventLeaderboard(testEvent.getId(), null, "OVERALL", studentB, false);

        assertNotNull(leaderboard);
        assertTrue(leaderboard.getIsPublic());
        assertEquals(4, leaderboard.getTotalParticipants());
        assertEquals(8.5, leaderboard.getHighestScore());

        // Kiểm tra thứ tự xếp hạng:
        // Rank 1: Student A (8.5)
        // Rank 2: Student B (8.0, duration 40m nhanh hơn C)
        // Rank 3: Student C (8.0, duration 55m)
        // Rank 4: Student D (7.0)
        assertEquals(1, leaderboard.getRankings().get(0).getRank());
        assertEquals("Nguyễn Văn A", leaderboard.getRankings().get(0).getFullName());
        assertEquals(8.5, leaderboard.getRankings().get(0).getOverallScore());

        assertEquals(2, leaderboard.getRankings().get(1).getRank());
        assertEquals("Trần Thị B", leaderboard.getRankings().get(1).getFullName());
        assertEquals(8.0, leaderboard.getRankings().get(1).getOverallScore());

        assertEquals(3, leaderboard.getRankings().get(2).getRank());
        assertEquals("Lê Hoàng C", leaderboard.getRankings().get(2).getFullName());
        assertEquals(8.0, leaderboard.getRankings().get(2).getOverallScore());

        assertEquals(4, leaderboard.getRankings().get(3).getRank());
        assertEquals("Phạm Minh D", leaderboard.getRankings().get(3).getFullName());

        // Kiểm tra Top 3 Podium
        assertEquals(3, leaderboard.getTopThree().size());
        assertEquals("Nguyễn Văn A", leaderboard.getTopThree().get(0).getFullName());
        assertEquals("Trần Thị B", leaderboard.getTopThree().get(1).getFullName());
        assertEquals("Lê Hoàng C", leaderboard.getTopThree().get(2).getFullName());

        // Kiểm tra myRank của Student B
        assertNotNull(leaderboard.getMyRank());
        assertEquals(2, leaderboard.getMyRank().getRank());
        assertEquals("Trần Thị B", leaderboard.getMyRank().getFullName());
    }

    @Test
    @DisplayName("Test 2: Lọc theo Ca Thi (Shift Filter)")
    void testFilterByShift() {
        // Lọc ca chiều (shiftAfternoon: 2002L) -> Chỉ có Student C và Student D
        EventLeaderboardDto leaderboard = examService.getEventLeaderboard(testEvent.getId(), shiftAfternoon.getId(), "OVERALL", null, false);

        assertNotNull(leaderboard);
        assertEquals(2, leaderboard.getTotalParticipants());
        assertEquals("Lê Hoàng C", leaderboard.getRankings().get(0).getFullName());
        assertEquals("Phạm Minh D", leaderboard.getRankings().get(1).getFullName());
    }

    @Test
    @DisplayName("Test 3: Lọc theo Kỹ Năng (Skill Filter: READING)")
    void testFilterBySkill() {
        // Lọc kỹ năng Reading
        EventLeaderboardDto leaderboard = examService.getEventLeaderboard(testEvent.getId(), null, "READING", null, false);

        assertNotNull(leaderboard);
        assertEquals(4, leaderboard.getTotalParticipants());
        assertEquals("Nguyễn Văn A", leaderboard.getRankings().get(0).getFullName());
        assertEquals(9.0, leaderboard.getRankings().get(0).getScoreReading());
    }

    @Test
    @DisplayName("Test 4: Tính năng Ẩn Bảng Xếp Hạng (Privacy Toggle)")
    void testLeaderboardVisibilityToggle() {
        // Admin ẩn bảng xếp hạng
        examService.toggleLeaderboardVisibility(testEvent.getId(), false);
        assertFalse(testEvent.getIsLeaderboardPublic());

        // Học viên xem -> isPublic = false, rankings rỗng, nhưng vẫn thấy điểm cá nhân trong myRank
        EventLeaderboardDto studentView = examService.getEventLeaderboard(testEvent.getId(), null, "OVERALL", studentA, false);
        assertFalse(studentView.getIsPublic());
        assertEquals(0, studentView.getTotalParticipants());
        assertTrue(studentView.getRankings() == null || studentView.getRankings().isEmpty());
        assertNotNull(studentView.getMyRank());
        assertEquals("Nguyễn Văn A", studentView.getMyRank().getFullName());

        // Admin xem -> Thấy đầy đủ dù đang ẩn
        EventLeaderboardDto adminView = examService.getEventLeaderboard(testEvent.getId(), null, "OVERALL", adminUser, true);
        assertFalse(adminView.getIsPublic());
        assertEquals(4, adminView.getTotalParticipants());
        assertEquals(4, adminView.getRankings().size());

        // Admin mở lại
        examService.toggleLeaderboardVisibility(testEvent.getId(), true);
        assertTrue(testEvent.getIsLeaderboardPublic());
        EventLeaderboardDto reopened = examService.getEventLeaderboard(testEvent.getId(), null, "OVERALL", studentA, false);
        assertTrue(reopened.getIsPublic());
        assertEquals(4, reopened.getTotalParticipants());
    }

    @Test
    @DisplayName("Test 5: Phân tích câu hỏi bẫy (Top Hardest Questions)")
    void testHardestQuestionsAnalysis() {
        EventLeaderboardDto leaderboard = examService.getEventLeaderboard(testEvent.getId(), null, "OVERALL", null, true);

        assertNotNull(leaderboard.getTopHardestQuestions());
        assertFalse(leaderboard.getTopHardestQuestions().isEmpty());

        // Câu 2 có 3 thí sinh sai (B, C, D sai, chỉ A đúng) -> tỉ lệ sai 75%
        // Câu 1 có 2 thí sinh sai (C, D sai, A, B đúng) -> tỉ lệ sai 50%
        // Câu 2 phải xếp trên Câu 1 trong bảng câu hỏi bẫy
        assertEquals(2, leaderboard.getTopHardestQuestions().get(0).getQuestionNumber());
        assertEquals(75.0, leaderboard.getTopHardestQuestions().get(0).getWrongRate());

        assertEquals(1, leaderboard.getTopHardestQuestions().get(1).getQuestionNumber());
        assertEquals(50.0, leaderboard.getTopHardestQuestions().get(1).getWrongRate());
    }

    @Test
    @DisplayName("Test 6: Xuất file CSV Bảng Xếp Hạng (UTF-8 BOM)")
    void testExportCsv() {
        byte[] csvBytes = examService.exportLeaderboardCsv(testEvent.getId(), null);

        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 0);

        String csvString = new String(csvBytes, StandardCharsets.UTF_8);
        // Kiểm tra UTF-8 BOM
        assertTrue(csvString.startsWith("\uFEFF"));
        // Kiểm tra tiêu đề các cột
        assertTrue(csvString.contains("Thứ hạng,Họ và tên,Tên tài khoản"));
        // Kiểm tra danh sách thí sinh có tên trong CSV
        assertTrue(csvString.contains("Nguyễn Văn A"));
        assertTrue(csvString.contains("Trần Thị B"));
        assertTrue(csvString.contains("Lê Hoàng C"));
        assertTrue(csvString.contains("Phạm Minh D"));
    }
}
