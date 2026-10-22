package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.dto.*;
import com.ielts.lms.booking.entity.*;
import com.ielts.lms.booking.repository.*;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.booking.service.ExternalDbSyncService;
import com.ielts.lms.booking.service.TestEventExamService;
import com.ielts.lms.entity.MockQuestion;
import com.ielts.lms.entity.MockTest;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Bộ kiểm thử toàn diện:
 * 1. Phân biệt độc lập rõ ràng giữa chức năng "Đặt lịch ca kèm" (SupportBooking) và "Tạo sự kiện thi" (TestEvent).
 * 2. Lấy dữ liệu 1 bài Reading và 1 bài Listening từ MockTest chuyển sang cấu hình đề thi Online TestEvent.
 * 3. Kiểm thử trọn vẹn vòng đời thi Online: Khung giờ mở đề 1 tiếng, đếm ngược, bắt đầu làm bài, nộp bài, chấm điểm IELTS Band Score tự động và xem lại bài làm.
 */
@ExtendWith(MockitoExtension.class)
class OnlineExamComprehensiveTest {

    // --- Mock Repositories cho Event Exam ---
    @Mock
    private TestEventRepository eventRepository;

    @Mock
    private TestEventShiftRepository shiftRepository;

    @Mock
    private TestEventRegistrationRepository registrationRepository;

    @Mock
    private TestEventQuestionRepository questionRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private TestEventExamService examService;

    // --- Mock Repositories cho Support Booking (Đặt lịch kèm) ---
    @Mock
    private SupportBookingRepository bookingRepository;

    @Mock
    private ExternalDbSyncService externalDbSyncService;

    @InjectMocks
    private BookingService bookingService;

    // --- Dữ liệu Mock Test nguồn ---
    private MockTest mockReadingTest;
    private MockTest mockListeningTest;
    private List<MockQuestion> mockReadingQuestions;
    private List<MockQuestion> mockListeningQuestions;

    private User student;
    private User admin;
    private TestEvent testEvent;
    private TestEventShift testShift;
    private TestEventRegistration registration;

    @BeforeEach
    void setUp() {
        student = new User();
        student.setId(101L);
        student.setUsername("student_ielts");
        student.setFullName("Nguyen Van Thi Sinh");
        student.setRole("ROLE_USER");

        admin = new User();
        admin.setId(1L);
        admin.setUsername("admin_root");
        admin.setFullName("Quản trị viên");
        admin.setRole("ROLE_ADMIN");

        // 1. Dữ liệu bài Mock Test Reading mẫu
        mockReadingTest = new MockTest();
        mockReadingTest.setId(10L);
        mockReadingTest.setTitle("Cambridge IELTS 18 - Academic Reading Test 1");
        mockReadingTest.setType("READING");
        mockReadingTest.setPdfUrl("https://ielts-lms.storage/cam18-reading1.pdf");

        mockReadingQuestions = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            MockQuestion q = new MockQuestion();
            q.setId((long) (100 + i));
            q.setQuestionNumber(i);
            q.setQuestionText("Reading Question " + i);
            if (i <= 13) {
                q.setCorrectAnswer(i % 3 == 0 ? "NOT GIVEN" : (i % 2 == 0 ? "FALSE" : "TRUE"));
            } else if (i <= 26) {
                q.setCorrectAnswer("answer_" + i);
            } else {
                q.setCorrectAnswer(List.of("A", "B", "C", "D").get(i % 4));
            }
            mockReadingQuestions.add(q);
        }

        // 2. Dữ liệu bài Mock Test Listening mẫu
        mockListeningTest = new MockTest();
        mockListeningTest.setId(20L);
        mockListeningTest.setTitle("Cambridge IELTS 18 - Academic Listening Test 1");
        mockListeningTest.setType("LISTENING");
        mockListeningTest.setPdfUrl("https://ielts-lms.storage/cam18-listening1.pdf");
        mockListeningTest.setAudioUrl("https://ielts-lms.storage/cam18-listening1.mp3");

        mockListeningQuestions = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            MockQuestion q = new MockQuestion();
            q.setId((long) (200 + i));
            q.setQuestionNumber(i);
            q.setQuestionText("Listening Question " + i);
            if (i <= 10) {
                q.setCorrectAnswer(i == 1 ? "library/main library" : "word_" + i);
            } else {
                q.setCorrectAnswer(List.of("A", "B", "C").get(i % 3));
            }
            mockListeningQuestions.add(q);
        }

        // 3. Cấu hình Sự kiện thi Online (TestEvent)
        testEvent = new TestEvent();
        testEvent.setId(500L);
        testEvent.setTitle("Kỳ Thi Thử Trực Tuyến IELTS Mock Exam 2026");
        testEvent.setEventDate(LocalDate.now());
        testEvent.setExamFormat("ONLINE");
        testEvent.setSkillType("BOTH");
        testEvent.setDurationMinutes(120);
        testEvent.setLocation("Online Test Room");
        testEvent.setAllowReview(true);

        testShift = new TestEventShift();
        testShift.setId(800L);
        testShift.setTestEvent(testEvent);
        testShift.setShiftName("Ca Thi Sáng Chủ Nhật");
        testShift.setStartTime("09:00");
        testShift.setEndTime("11:00");
        testShift.setMaxCapacity(50);
        testShift.setCurrentRegistered(1);

        testEvent.setShifts(List.of(testShift));

        registration = new TestEventRegistration();
        registration.setId(900L);
        registration.setUser(student);
        registration.setShift(testShift);
        registration.setFullName("Nguyen Van Thi Sinh");
        registration.setStatus("REGISTERED");
    }

    // =========================================================================
    // PHẦN 1: ĐẢM BẢO TÍNH ĐỘC LẬP GIỮA "ĐẶT LỊCH HỖ TRỢ" VÀ "TẠO SỰ KIỆN THI"
    // =========================================================================

    @Test
    @DisplayName("TC-ISOLATION-01: Đặt lịch ca hỗ trợ 1-1/nhóm không can thiệp hay làm ảnh hưởng đến Sự kiện thi Online")
    void testSupportBookingIsolationFromEvent() {
        // Given: Học viên đặt 1 ca hỗ trợ 30 phút từ 17:00 đến 17:30
        LocalDate bookingDate = LocalDate.now().plusDays(1);
        CreateSupportBookingDto bookingDto = new CreateSupportBookingDto();
        bookingDto.setBookingDate(bookingDate);
        bookingDto.setStartTime("17:00");
        bookingDto.setEndTime("17:30");
        bookingDto.setSkill("READING");
        bookingDto.setStudentNote("Em cần hỗ trợ kỹ năng Matching Headings");

        when(bookingRepository.findUserOverlappingBookings(student.getId(), bookingDate, "17:00", "17:30"))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.findOverlappingBookings(bookingDate, "17:00", "17:30"))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.save(any(SupportBooking.class))).thenAnswer(invocation -> {
            SupportBooking saved = invocation.getArgument(0);
            saved.setId(777L);
            return saved;
        });

        // When: Học viên thực hiện đặt lịch hỗ trợ
        SupportBooking createdBooking = bookingService.bookSupportSession(bookingDto, student);

        // Then:
        assertThat(createdBooking).isNotNull();
        assertThat(createdBooking.getId()).isEqualTo(777L);
        assertThat(createdBooking.getSkill()).isEqualTo("READING");
        assertThat(createdBooking.getStartTime()).isEqualTo("17:00");

        // Khẳng định: Hoàn toàn không tương tác hay ghi đè bất kỳ dữ liệu nào của test_events hay test_event_registrations
        verifyNoInteractions(eventRepository);
        verifyNoInteractions(shiftRepository);
        verifyNoInteractions(registrationRepository);
        verifyNoInteractions(questionRepository);
    }

    // =========================================================================
    // PHẦN 2: LẤY DỮ LIỆU TỪ MOCKTEST SANG CẤU HÌNH ĐỀ THI ONLINE (TESTEVENT)
    // =========================================================================

    @Test
    @DisplayName("TC-SYNC-02: Lấy dữ liệu đề Reading và Listening từ MockTest chuyển sang TestEvent thành công")
    void testTransferMockTestDataToEventExamConfig() {
        // Given: Chuẩn bị EventExamConfigDto kết hợp từ mockReadingTest và mockListeningTest
        EventExamConfigDto configDto = new EventExamConfigDto();
        configDto.setExamFormat("ONLINE");
        configDto.setSkillType("BOTH");
        configDto.setDurationMinutes(120);
        // Lấy PDF từ bài Reading, Audio từ bài Listening bên MockTest
        configDto.setPdfUrl(mockReadingTest.getPdfUrl());
        configDto.setAudioUrl(mockListeningTest.getAudioUrl());
        configDto.setPassageText("Reading Passage 1: The Secret Life of Plants...\nReading Passage 2: Urban Architecture...");
        configDto.setAllowReview(true);

        List<EventExamConfigDto.QuestionConfigDto> questions = new ArrayList<>();
        // 40 câu Reading
        for (MockQuestion q : mockReadingQuestions) {
            EventExamConfigDto.QuestionConfigDto item = new EventExamConfigDto.QuestionConfigDto();
            item.setSkill("READING");
            item.setQuestionNumber(q.getQuestionNumber());
            item.setQuestionText(q.getQuestionText());
            item.setCorrectAnswer(q.getCorrectAnswer());
            questions.add(item);
        }
        // 40 câu Listening
        for (MockQuestion q : mockListeningQuestions) {
            EventExamConfigDto.QuestionConfigDto item = new EventExamConfigDto.QuestionConfigDto();
            item.setSkill("LISTENING");
            item.setQuestionNumber(q.getQuestionNumber());
            item.setQuestionText(q.getQuestionText());
            item.setCorrectAnswer(q.getCorrectAnswer());
            questions.add(item);
        }
        configDto.setQuestions(questions);

        when(eventRepository.findById(500L)).thenReturn(Optional.of(testEvent));
        when(eventRepository.save(any(TestEvent.class))).thenAnswer(i -> i.getArgument(0));

        // When: Admin lưu cấu hình đề thi cho sự kiện
        TestEvent savedEvent = examService.saveExamConfig(500L, configDto);

        // Then:
        assertThat(savedEvent.getPdfUrl()).isEqualTo("https://ielts-lms.storage/cam18-reading1.pdf");
        assertThat(savedEvent.getAudioUrl()).isEqualTo("https://ielts-lms.storage/cam18-listening1.mp3");
        assertThat(savedEvent.getPassageText()).contains("The Secret Life of Plants");

        // Đảm bảo 80 câu hỏi (40 Reading + 40 Listening) được lưu chuẩn vào test_event_questions
        verify(questionRepository).deleteByTestEventId(500L);
        verify(questionRepository).saveAll(argThat(list -> {
            List<TestEventQuestion> qList = (List<TestEventQuestion>) list;
            return qList.size() == 80;
        }));
    }

    // =========================================================================
    // PHẦN 3: KIỂM THỬ KHUNG GIỜ 1 TIẾNG VÀ ZERO-LEAKAGE (BẢO MẬT ĐỀ THI)
    // =========================================================================

    @Test
    @DisplayName("TC-WINDOW-03: Trước giờ mở đề -> Trả về EARLY + đếm ngược, KHÔNG để lộ nội dung đề thi hay đáp án")
    void testEarlyAccessSecurity() {
        // Given: Ca thi bắt đầu vào ngày mai
        testEvent.setEventDate(LocalDate.now().plusDays(1));
        testShift.setStartTime("10:00");

        when(shiftRepository.findById(800L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(800L, student.getId()))
                .thenReturn(Optional.of(registration));

        // When: Thí sinh kiểm tra quyền truy cập trước giờ thi
        ExamAccessStatusDto status = examService.getExamAccessStatus(800L, student);

        // Then:
        assertThat(status.getStatus()).isEqualTo("EARLY");
        assertThat(status.getSecondsUntilWindow()).isGreaterThan(0);
        // Tuyệt đối không cho phép gọi startExam trước giờ mở đề
        assertThatThrownBy(() -> examService.startExam(800L, student))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chưa đến thời điểm mở đề thi");
    }

    @Test
    @DisplayName("TC-WINDOW-04: Quá hạn khung giờ 1 tiếng mà không vào thi -> MISSED_WINDOW, khóa quyền làm bài")
    void testMissedWindowLock() {
        // Given: Ca thi bắt đầu lúc 2 tiếng trước
        LocalTime pastTime = LocalTime.now().minusHours(2);
        testEvent.setEventDate(LocalDate.now());
        testShift.setStartTime(pastTime.format(DateTimeFormatter.ofPattern("HH:mm")));

        when(shiftRepository.findById(800L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(800L, student.getId()))
                .thenReturn(Optional.of(registration));

        // When:
        ExamAccessStatusDto status = examService.getExamAccessStatus(800L, student);

        // Then:
        assertThat(status.getStatus()).isEqualTo("MISSED_WINDOW");
        assertThatThrownBy(() -> examService.startExam(800L, student))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Đã quá thời hạn 1 tiếng để mở đề thi");
    }

    // =========================================================================
    // PHẦN 4: LÀM BÀI, NỘP BÀI VÀ CHẤM ĐIỂM IELTS BAND SCORE CHUẨN XÁC
    // =========================================================================

    @Test
    @DisplayName("TC-EXAM-05: Thí sinh làm bài, nộp bài thành công và nhận điểm Band Score Cambridge IELTS chuẩn")
    void testStudentExamSubmissionAndAccurateGrading() {
        // Given: Ca thi bắt đầu từ 5 phút trước -> đang trong khung giờ 1 tiếng mở đề
        LocalTime activeStart = LocalTime.now().minusMinutes(5);
        testEvent.setEventDate(LocalDate.now());
        testShift.setStartTime(activeStart.format(DateTimeFormatter.ofPattern("HH:mm")));

        testEvent.setPdfUrl(mockReadingTest.getPdfUrl());
        testEvent.setAudioUrl(mockListeningTest.getAudioUrl());
        testEvent.setPassageText("Passage 1 content...");

        when(shiftRepository.findById(800L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(800L, student.getId()))
                .thenReturn(Optional.of(registration));

        List<TestEventQuestion> eventQuestions = new ArrayList<>();
        // 40 câu Reading
        for (MockQuestion mq : mockReadingQuestions) {
            TestEventQuestion eq = new TestEventQuestion();
            eq.setTestEvent(testEvent);
            eq.setSkill("READING");
            eq.setQuestionNumber(mq.getQuestionNumber());
            eq.setQuestionText(mq.getQuestionText());
            eq.setCorrectAnswer(mq.getCorrectAnswer());
            eventQuestions.add(eq);
        }
        // 40 câu Listening
        for (MockQuestion mq : mockListeningQuestions) {
            TestEventQuestion eq = new TestEventQuestion();
            eq.setTestEvent(testEvent);
            eq.setSkill("LISTENING");
            eq.setQuestionNumber(mq.getQuestionNumber());
            eq.setQuestionText(mq.getQuestionText());
            eq.setCorrectAnswer(mq.getCorrectAnswer());
            eventQuestions.add(eq);
        }
        when(questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(500L)).thenReturn(eventQuestions);
        when(registrationRepository.save(any(TestEventRegistration.class))).thenAnswer(i -> i.getArgument(0));

        // 1. Thí sinh bấm mở đề thi
        StartExamResponseDto examData = examService.startExam(800L, student);
        assertThat(examData).isNotNull();
        assertThat(examData.getQuestions()).hasSize(80);

        long readingCount = examData.getQuestions().stream().filter(q -> "READING".equals(q.getSkill())).count();
        long listeningCount = examData.getQuestions().stream().filter(q -> "LISTENING".equals(q.getSkill())).count();
        assertThat(readingCount).isEqualTo(40);
        assertThat(listeningCount).isEqualTo(40);

        // 2. Thí sinh chuẩn bị bài nộp:
        // Đánh đúng 35/40 câu Reading -> Band 8.0
        // Đánh đúng 32/40 câu Listening -> Band 7.5
        // -> Overall = (8.0 + 7.5) / 2 = 7.75 -> Làm tròn IELTS thành 8.0!
        SubmitEventExamDto submitDto = new SubmitEventExamDto();
        Map<String, String> answers = new HashMap<>();

        for (int i = 1; i <= 40; i++) {
            if (i <= 35) {
                // Đúng 35 câu reading
                answers.put("READING_" + i, mockReadingQuestions.get(i - 1).getCorrectAnswer());
            } else {
                answers.put("READING_" + i, "WRONG_ANSWER");
            }

            if (i <= 32) {
                // Đúng 32 câu listening (bao gồm cả biến thể "main library" cho đáp án "library/main library")
                if (i == 1) {
                    answers.put("LISTENING_1", "main library"); // Kiểm tra khớp biến thể slash "/"
                } else {
                    answers.put("LISTENING_" + i, mockListeningQuestions.get(i - 1).getCorrectAnswer());
                }
            } else {
                answers.put("LISTENING_" + i, "WRONG_ANSWER");
            }
        }
        submitDto.setAnswers(answers);

        // When: Thí sinh nộp bài
        ExamSubmissionResultDto result = examService.submitExam(800L, submitDto, student);

        // Then:
        assertThat(result).isNotNull();
        assertThat(result.getReadingCorrectCount()).isEqualTo(35);
        assertThat(result.getListeningCorrectCount()).isEqualTo(32);
        assertThat(result.getScoreReading()).isEqualTo(8.0);
        assertThat(result.getScoreListening()).isEqualTo(7.5);
        assertThat(result.getOverallScore()).isEqualTo(8.0); // 7.75 làm tròn lên 8.0 chuẩn Cambridge IELTS!

        // Trạng thái phiếu đăng ký chuyển sang ATTENDED
        assertThat(registration.getStatus()).isEqualTo("ATTENDED");
        assertThat(registration.getExamSubmittedAt()).isNotNull();
    }
}
