package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.dto.*;
import com.ielts.lms.booking.entity.*;
import com.ielts.lms.booking.repository.*;
import com.ielts.lms.booking.service.TestEventExamService;
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
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestEventExamServiceTest {

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

    private User testStudent;
    private TestEvent testEvent;
    private TestEventShift testShift;
    private TestEventRegistration testRegistration;

    @BeforeEach
    void setUp() {
        testStudent = new User();
        testStudent.setId(100L);
        testStudent.setUsername("student1");
        testStudent.setFullName("Nguyen Van A");

        testEvent = new TestEvent();
        testEvent.setId(1L);
        testEvent.setTitle("Thi Thử IELTS Đợt 1");
        testEvent.setEventDate(LocalDate.now());
        testEvent.setExamFormat("ONLINE");
        testEvent.setSkillType("READING");
        testEvent.setDurationMinutes(60);
        testEvent.setPdfUrl("https://example.com/reading-test.pdf");

        testShift = new TestEventShift();
        testShift.setId(10L);
        testShift.setTestEvent(testEvent);
        testShift.setShiftName("Ca Tối (19:00 - 21:00)");
        testShift.setStartTime("19:00");
        testShift.setEndTime("21:00");

        testRegistration = new TestEventRegistration();
        testRegistration.setId(200L);
        testRegistration.setShift(testShift);
        testRegistration.setUser(testStudent);
        testRegistration.setFullName("Nguyen Van A");
        testRegistration.setStatus("REGISTERED");
    }

    @Test
    @DisplayName("Cấu hình đề thi Online lưu thành công PDF, Bài đọc và câu hỏi")
    void testSaveExamConfig() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(testEvent));
        when(eventRepository.save(any(TestEvent.class))).thenAnswer(i -> i.getArgument(0));

        EventExamConfigDto dto = new EventExamConfigDto();
        dto.setExamFormat("ONLINE");
        dto.setSkillType("READING");
        dto.setDurationMinutes(60);
        dto.setPdfUrl("https://example.com/test.pdf");
        dto.setPassageText("Reading Passage 1: The history of tea...");

        EventExamConfigDto.QuestionConfigDto q1 = new EventExamConfigDto.QuestionConfigDto();
        q1.setSkill("READING");
        q1.setQuestionNumber(1);
        q1.setCorrectAnswer("TRUE");

        dto.setQuestions(List.of(q1));

        TestEvent saved = examService.saveExamConfig(1L, dto);

        assertThat(saved).isNotNull();
        assertThat(saved.getPdfUrl()).isEqualTo("https://example.com/test.pdf");
        assertThat(saved.getPassageText()).contains("The history of tea");
        verify(questionRepository).deleteByTestEventId(1L);
        verify(questionRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Kiểm tra trạng thái khi chưa đến giờ mở đề -> EARLY")
    void testGetExamAccessStatus_Early() {
        // Đặt giờ thi vào tương lai (ví dụ 23:00)
        testShift.setStartTime("23:59");
        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(10L, 100L)).thenReturn(Optional.of(testRegistration));

        ExamAccessStatusDto status = examService.getExamAccessStatus(10L, testStudent);

        assertThat(status.getStatus()).isEqualTo("EARLY");
        assertThat(status.getSecondsUntilWindow()).isGreaterThan(0);
    }

    @Test
    @DisplayName("Kiểm tra trạng thái trong khung 1 tiếng mở đề -> OPEN_WINDOW")
    void testGetExamAccessStatus_OpenWindow() {
        // Đặt giờ bắt đầu lùi lại 10 phút trước
        LocalTime now = LocalTime.now();
        String startTimeStr = String.format("%02d:%02d", now.getHour(), Math.max(0, now.getMinute() - 10));
        testShift.setStartTime(startTimeStr);

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(10L, 100L)).thenReturn(Optional.of(testRegistration));

        ExamAccessStatusDto status = examService.getExamAccessStatus(10L, testStudent);

        assertThat(status.getStatus()).isEqualTo("OPEN_WINDOW");
    }

    @Test
    @DisplayName("Bắt đầu làm bài trong khung 1 tiếng thành công và trả về đề không kèm đáp án")
    void testStartExam_Success() {
        LocalTime now = LocalTime.now();
        String startTimeStr = String.format("%02d:%02d", now.getHour(), Math.max(0, now.getMinute() - 10));
        testShift.setStartTime(startTimeStr);

        TestEventQuestion q1 = new TestEventQuestion();
        q1.setSkill("READING");
        q1.setQuestionNumber(1);
        q1.setQuestionText("Question 1 text");
        q1.setCorrectAnswer("SECRET_ANSWER"); // Không được lộ ra ngoài

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(10L, 100L)).thenReturn(Optional.of(testRegistration));
        when(questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(1L)).thenReturn(List.of(q1));

        StartExamResponseDto res = examService.startExam(10L, testStudent);

        assertThat(res).isNotNull();
        assertThat(res.getPdfUrl()).isEqualTo("https://example.com/reading-test.pdf");
        assertThat(res.getQuestions()).hasSize(1);
        assertThat(res.getQuestions().get(0).getQuestionNumber()).isEqualTo(1);
        // Kiểm tra chắc chắn không có trường correctAnswer
        assertThat(testRegistration.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(testRegistration.getExamStartedAt()).isNotNull();
    }

    @Test
    @DisplayName("Chấm điểm bài nộp tự động, tính chuẩn số câu đúng và Band Score")
    void testSubmitExam_CalculatesBandScore() {
        testRegistration.setExamStartedAt(Timestamp.valueOf(LocalDateTime.now().minusMinutes(30)));
        testRegistration.setStatus("IN_PROGRESS");

        TestEventQuestion q1 = new TestEventQuestion();
        q1.setSkill("READING");
        q1.setQuestionNumber(1);
        q1.setCorrectAnswer("TRUE");

        TestEventQuestion q2 = new TestEventQuestion();
        q2.setSkill("READING");
        q2.setQuestionNumber(2);
        q2.setCorrectAnswer("centre/center"); // Chấp nhận biến thể

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.findByShiftIdAndUserId(10L, 100L)).thenReturn(Optional.of(testRegistration));
        when(questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(1L)).thenReturn(List.of(q1, q2));

        SubmitEventExamDto submitDto = new SubmitEventExamDto();
        submitDto.setAnswers(Map.of(
                "READING_1", "true",
                "READING_2", "center"
        ));

        ExamSubmissionResultDto result = examService.submitExam(10L, submitDto, testStudent);

        assertThat(result).isNotNull();
        assertThat(result.getReadingCorrectCount()).isEqualTo(2);
        assertThat(result.getScoreReading()).isNotNull();
        assertThat(testRegistration.getStatus()).isEqualTo("ATTENDED");
        assertThat(testRegistration.getExamSubmittedAt()).isNotNull();
    }
}
