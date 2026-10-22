package com.ielts.lms.booking.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.dto.*;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventQuestion;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.entity.TestEventShift;
import com.ielts.lms.booking.repository.TestEventQuestionRepository;
import com.ielts.lms.booking.repository.TestEventRegistrationRepository;
import com.ielts.lms.booking.repository.TestEventRepository;
import com.ielts.lms.booking.repository.TestEventShiftRepository;
import com.ielts.lms.booking.util.IeltsScoreCalculator;
import com.ielts.lms.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestEventExamService {

    private final TestEventRepository eventRepository;
    private final TestEventShiftRepository shiftRepository;
    private final TestEventRegistrationRepository registrationRepository;
    private final TestEventQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    /**
     * Admin cấu hình nội dung đề thi, tài liệu (PDF, Audio, Bài đọc) và bảng đáp án
     */
    @Transactional
    public TestEvent saveExamConfig(Long eventId, EventExamConfigDto dto) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện thi ID " + eventId));

        if (dto.getExamFormat() != null) event.setExamFormat(dto.getExamFormat());
        if (dto.getSkillType() != null) event.setSkillType(dto.getSkillType());
        if (dto.getDurationMinutes() != null && dto.getDurationMinutes() > 0) {
            event.setDurationMinutes(dto.getDurationMinutes());
        }
        event.setPdfUrl(dto.getPdfUrl());
        event.setAudioUrl(dto.getAudioUrl());
        event.setPassageText(dto.getPassageText());
        if (dto.getAllowReview() != null) event.setAllowReview(dto.getAllowReview());

        // Cập nhật câu hỏi nếu có
        if (dto.getQuestions() != null) {
            questionRepository.deleteByTestEventId(eventId);
            List<TestEventQuestion> questions = new ArrayList<>();
            for (EventExamConfigDto.QuestionConfigDto qDto : dto.getQuestions()) {
                if (qDto.getQuestionNumber() != null && qDto.getCorrectAnswer() != null) {
                    TestEventQuestion q = new TestEventQuestion();
                    q.setTestEvent(event);
                    q.setSkill(qDto.getSkill() != null ? qDto.getSkill().toUpperCase().trim() : "READING");
                    q.setQuestionNumber(qDto.getQuestionNumber());
                    q.setQuestionText(qDto.getQuestionText());
                    q.setCorrectAnswer(qDto.getCorrectAnswer().trim());
                    questions.add(q);
                }
            }
            if (!questions.isEmpty()) {
                questionRepository.saveAll(questions);
            }
        }

        return eventRepository.save(event);
    }

    /**
     * Lấy cấu hình đề thi cho Admin (kèm đáp án đúng)
     */
    public EventExamConfigDto getExamConfigAdmin(Long eventId) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện thi ID " + eventId));

        List<TestEventQuestion> questions = questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(eventId);

        EventExamConfigDto dto = new EventExamConfigDto();
        dto.setExamFormat(event.getExamFormat());
        dto.setSkillType(event.getSkillType());
        dto.setDurationMinutes(event.getDurationMinutes());
        dto.setPdfUrl(event.getPdfUrl());
        dto.setAudioUrl(event.getAudioUrl());
        dto.setPassageText(event.getPassageText());
        dto.setAllowReview(event.getAllowReview());

        List<EventExamConfigDto.QuestionConfigDto> qDtos = new ArrayList<>();
        for (TestEventQuestion q : questions) {
            EventExamConfigDto.QuestionConfigDto qDto = new EventExamConfigDto.QuestionConfigDto();
            qDto.setSkill(q.getSkill());
            qDto.setQuestionNumber(q.getQuestionNumber());
            qDto.setQuestionText(q.getQuestionText());
            qDto.setCorrectAnswer(q.getCorrectAnswer());
            qDtos.add(qDto);
        }
        dto.setQuestions(qDtos);
        return dto;
    }

    /**
     * Kiểm tra trạng thái truy cập phòng thi của học viên (Phòng chờ / Mở đề / Đang làm / Đã nộp)
     */
    public ExamAccessStatusDto getExamAccessStatus(Long shiftId, User user) {
        TestEventShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca thi ID " + shiftId));
        TestEvent event = shift.getTestEvent();

        TestEventRegistration registration = registrationRepository.findByShiftIdAndUserId(shiftId, user.getId())
                .orElse(null);

        if (registration == null) {
            return ExamAccessStatusDto.builder()
                    .status("NOT_REGISTERED")
                    .shiftId(shiftId)
                    .eventId(event.getId())
                    .eventTitle(event.getTitle())
                    .shiftName(shift.getShiftName())
                    .build();
        }

        LocalDateTime serverTime = LocalDateTime.now();
        LocalTime startTime = LocalTime.parse(shift.getStartTime());
        LocalDateTime windowStart = LocalDateTime.of(event.getEventDate(), startTime);
        LocalDateTime windowEnd = windowStart.plusHours(1); // Cửa sổ mở đề 1 tiếng tính từ thời điểm setup

        Integer duration = event.getDurationMinutes() != null ? event.getDurationMinutes() : 60;

        ExamAccessStatusDto.ExamAccessStatusDtoBuilder builder = ExamAccessStatusDto.builder()
                .registrationId(registration.getId())
                .eventId(event.getId())
                .shiftId(shiftId)
                .eventTitle(event.getTitle())
                .shiftName(shift.getShiftName())
                .examFormat(event.getExamFormat())
                .skillType(event.getSkillType())
                .durationMinutes(duration)
                .serverTime(serverTime)
                .windowStart(windowStart)
                .windowEnd(windowEnd)
                .allowReview(event.getAllowReview());

        // Đã nộp bài
        if (registration.getExamSubmittedAt() != null || "SUBMITTED".equals(registration.getStatus()) || "ATTENDED".equals(registration.getStatus())) {
            return builder.status("SUBMITTED").build();
        }

        // Đang làm bài
        if (registration.getExamStartedAt() != null) {
            LocalDateTime startedAt = registration.getExamStartedAt().toLocalDateTime();
            LocalDateTime deadline = startedAt.plusMinutes(duration);
            long secondsRemaining = Duration.between(serverTime, deadline).getSeconds();

            if (secondsRemaining <= -120) { // Hết giờ quá 2 phút buffer -> tự động coi như hết hạn
                return builder.status("EXPIRED")
                        .examStartedAt(startedAt)
                        .personalDeadline(deadline)
                        .secondsRemainingInExam(0L)
                        .build();
            }

            return builder.status("IN_PROGRESS")
                    .examStartedAt(startedAt)
                    .personalDeadline(deadline)
                    .secondsRemainingInExam(Math.max(0, secondsRemaining))
                    .build();
        }

        // Chưa bắt đầu làm bài: Kiểm tra khung giờ mở đề 1 tiếng
        if (serverTime.isBefore(windowStart)) {
            long secondsUntil = Duration.between(serverTime, windowStart).getSeconds();
            return builder.status("EARLY")
                    .secondsUntilWindow(Math.max(0, secondsUntil))
                    .build();
        } else if (serverTime.isAfter(windowEnd)) {
            return builder.status("MISSED_WINDOW").build();
        } else {
            return builder.status("OPEN_WINDOW").build();
        }
    }

    /**
     * Học viên bấm "Bắt đầu làm bài" -> Khởi tạo đồng hồ làm bài và trả về đề thi (KHÔNG kèm đáp án)
     */
    @Transactional
    public StartExamResponseDto startExam(Long shiftId, User user) {
        TestEventShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca thi ID " + shiftId));
        TestEvent event = shift.getTestEvent();

        TestEventRegistration registration = registrationRepository.findByShiftIdAndUserId(shiftId, user.getId())
                .orElseThrow(() -> new RuntimeException("Bạn chưa đăng ký tham gia ca thi này!"));

        if (registration.getExamSubmittedAt() != null || "SUBMITTED".equals(registration.getStatus()) || "ATTENDED".equals(registration.getStatus())) {
            throw new RuntimeException("Bạn đã hoàn thành bài thi này trước đó!");
        }

        LocalDateTime serverTime = LocalDateTime.now();
        LocalTime startTime = LocalTime.parse(shift.getStartTime());
        LocalDateTime windowStart = LocalDateTime.of(event.getEventDate(), startTime);
        LocalDateTime windowEnd = windowStart.plusHours(1);

        // Nếu chưa bắt đầu làm bài thì kiểm tra cửa sổ 1 tiếng
        if (registration.getExamStartedAt() == null) {
            if (serverTime.isBefore(windowStart)) {
                throw new RuntimeException("Chưa đến thời điểm mở đề thi! Vui lòng đợi đến " + shift.getStartTime());
            }
            if (serverTime.isAfter(windowEnd.plusMinutes(2))) {
                throw new RuntimeException("Đã quá thời hạn 1 tiếng để mở đề thi! Cổng thi đã đóng.");
            }

            // Ghi nhận thời điểm bắt đầu
            registration.setExamStartedAt(Timestamp.valueOf(serverTime));
            registration.setStatus("IN_PROGRESS");
            registrationRepository.save(registration);
        }

        LocalDateTime startedAt = registration.getExamStartedAt().toLocalDateTime();
        Integer duration = event.getDurationMinutes() != null ? event.getDurationMinutes() : 60;
        LocalDateTime deadline = startedAt.plusMinutes(duration);
        long remainingSeconds = Duration.between(serverTime, deadline).getSeconds();

        if (remainingSeconds <= -120) {
            throw new RuntimeException("Đã hết thời gian làm bài thi của bạn!");
        }

        // Lấy câu hỏi đề thi (KHÔNG kèm đáp án đúng)
        List<TestEventQuestion> questions = questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(event.getId());
        List<StartExamResponseDto.StudentQuestionDto> studentQuestions = new ArrayList<>();
        for (TestEventQuestion q : questions) {
            studentQuestions.add(new StartExamResponseDto.StudentQuestionDto(
                    q.getSkill(),
                    q.getQuestionNumber(),
                    q.getQuestionText()
            ));
        }

        return StartExamResponseDto.builder()
                .registrationId(registration.getId())
                .eventId(event.getId())
                .shiftId(shiftId)
                .eventTitle(event.getTitle())
                .shiftName(shift.getShiftName())
                .skillType(event.getSkillType())
                .durationMinutes(duration)
                .startedAt(startedAt)
                .deadline(deadline)
                .remainingSeconds(Math.max(0, remainingSeconds))
                .pdfUrl(event.getPdfUrl())
                .audioUrl(event.getAudioUrl())
                .passageText(event.getPassageText())
                .questions(studentQuestions)
                .build();
    }

    /**
     * Nộp bài thi -> Tự động chấm điểm, tính Band Score IELTS và lưu vào database
     */
    @Transactional
    public ExamSubmissionResultDto submitExam(Long shiftId, SubmitEventExamDto dto, User user) {
        TestEventShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca thi ID " + shiftId));
        TestEvent event = shift.getTestEvent();

        TestEventRegistration registration = registrationRepository.findByShiftIdAndUserId(shiftId, user.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đăng ký ca thi của bạn!"));

        if (registration.getExamSubmittedAt() != null) {
            return getMyExamResult(registration.getId(), user);
        }

        if (registration.getExamStartedAt() == null) {
            throw new RuntimeException("Bạn chưa bấm bắt đầu làm bài thi!");
        }

        LocalDateTime serverTime = LocalDateTime.now();
        Map<String, String> studentAnswers = dto != null && dto.getAnswers() != null ? dto.getAnswers() : Collections.emptyMap();

        // Lấy toàn bộ đáp án chuẩn của đề thi
        List<TestEventQuestion> questions = questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(event.getId());

        int correctListening = 0;
        int correctReading = 0;

        List<ExamSubmissionResultDto.QuestionReviewDetailDto> reviewList = new ArrayList<>();

        for (TestEventQuestion q : questions) {
            String skill = q.getSkill().toUpperCase().trim();
            int qNum = q.getQuestionNumber();

            // Tìm câu trả lời của học viên theo các dạng key: "LISTENING_1" hoặc "1"
            String studentAns = studentAnswers.get(skill + "_" + qNum);
            if (studentAns == null) {
                studentAns = studentAnswers.get(String.valueOf(qNum));
            }

            boolean isCorrect = isAnswerCorrect(studentAns, q.getCorrectAnswer());

            if (isCorrect) {
                if ("LISTENING".equals(skill)) {
                    correctListening++;
                } else {
                    correctReading++;
                }
            }

            reviewList.add(ExamSubmissionResultDto.QuestionReviewDetailDto.builder()
                    .skill(skill)
                    .questionNumber(qNum)
                    .questionText(q.getQuestionText())
                    .studentAnswer(studentAns != null ? studentAns.trim() : "")
                    .correctAnswer(q.getCorrectAnswer())
                    .isCorrect(isCorrect)
                    .build());
        }

        String skillType = event.getSkillType() != null ? event.getSkillType().toUpperCase().trim() : "READING";

        Double bandListening = null;
        Double bandReading = null;
        Double overallBand = null;

        if ("LISTENING".equals(skillType) || "BOTH".equals(skillType)) {
            bandListening = IeltsScoreCalculator.calculateListeningBand(correctListening);
        }
        if ("READING".equals(skillType) || "BOTH".equals(skillType)) {
            bandReading = IeltsScoreCalculator.calculateReadingBand(correctReading);
        }

        if ("BOTH".equals(skillType) && bandListening != null && bandReading != null) {
            overallBand = IeltsScoreCalculator.roundIeltsOverall((bandListening + bandReading) / 2.0);
        } else if ("LISTENING".equals(skillType)) {
            overallBand = bandListening;
        } else if ("READING".equals(skillType)) {
            overallBand = bandReading;
        }

        // Lưu thông tin vào bản ghi đăng ký
        registration.setExamSubmittedAt(Timestamp.valueOf(serverTime));
        registration.setStatus("ATTENDED");
        registration.setListeningCorrectCount(correctListening);
        registration.setReadingCorrectCount(correctReading);
        registration.setScoreListening(bandListening);
        registration.setScoreReading(bandReading);
        registration.setOverallScore(overallBand);

        try {
            registration.setStudentAnswers(objectMapper.writeValueAsString(studentAnswers));
        } catch (Exception e) {
            log.error("Lỗi parse studentAnswers JSON", e);
        }

        registrationRepository.save(registration);

        return ExamSubmissionResultDto.builder()
                .registrationId(registration.getId())
                .eventId(event.getId())
                .shiftId(shiftId)
                .studentName(registration.getFullName())
                .eventTitle(event.getTitle())
                .shiftName(shift.getShiftName())
                .skillType(skillType)
                .listeningCorrectCount(correctListening)
                .readingCorrectCount(correctReading)
                .scoreListening(bandListening)
                .scoreReading(bandReading)
                .overallScore(overallBand)
                .submittedAt(serverTime)
                .feedback(registration.getFeedback())
                .allowReview(event.getAllowReview())
                .reviewDetails(Boolean.TRUE.equals(event.getAllowReview()) ? reviewList : null)
                .build();
    }

    /**
     * Học viên tra cứu kết quả thi cá nhân
     */
    public ExamSubmissionResultDto getMyExamResult(Long registrationId, User user) {
        TestEventRegistration reg = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đăng ký ID " + registrationId));

        // Kiểm tra quyền: chính chủ hoặc ADMIN
        if (!Objects.equals(reg.getUser().getId(), user.getId()) && !"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Bạn không có quyền xem kết quả của học viên này!");
        }

        TestEventShift shift = reg.getShift();
        TestEvent event = shift.getTestEvent();

        Map<String, String> studentAnswers = Collections.emptyMap();
        if (reg.getStudentAnswers() != null && !reg.getStudentAnswers().trim().isEmpty()) {
            try {
                studentAnswers = objectMapper.readValue(reg.getStudentAnswers(), new TypeReference<Map<String, String>>() {});
            } catch (Exception e) {
                log.error("Lỗi đọc studentAnswers JSON", e);
            }
        }

        List<ExamSubmissionResultDto.QuestionReviewDetailDto> reviewList = null;
        if (Boolean.TRUE.equals(event.getAllowReview())) {
            List<TestEventQuestion> questions = questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(event.getId());
            reviewList = new ArrayList<>();
            for (TestEventQuestion q : questions) {
                String skill = q.getSkill().toUpperCase().trim();
                int qNum = q.getQuestionNumber();
                String studentAns = studentAnswers.get(skill + "_" + qNum);
                if (studentAns == null) {
                    studentAns = studentAnswers.get(String.valueOf(qNum));
                }
                boolean isCorrect = isAnswerCorrect(studentAns, q.getCorrectAnswer());
                reviewList.add(ExamSubmissionResultDto.QuestionReviewDetailDto.builder()
                        .skill(skill)
                        .questionNumber(qNum)
                        .questionText(q.getQuestionText())
                        .studentAnswer(studentAns != null ? studentAns.trim() : "")
                        .correctAnswer(q.getCorrectAnswer())
                        .isCorrect(isCorrect)
                        .build());
            }
        }

        return ExamSubmissionResultDto.builder()
                .registrationId(reg.getId())
                .eventId(event.getId())
                .shiftId(shift.getId())
                .studentName(reg.getFullName())
                .eventTitle(event.getTitle())
                .shiftName(shift.getShiftName())
                .skillType(event.getSkillType())
                .listeningCorrectCount(reg.getListeningCorrectCount())
                .readingCorrectCount(reg.getReadingCorrectCount())
                .scoreListening(reg.getScoreListening())
                .scoreReading(reg.getScoreReading())
                .overallScore(reg.getOverallScore())
                .submittedAt(reg.getExamSubmittedAt() != null ? reg.getExamSubmittedAt().toLocalDateTime() : null)
                .feedback(reg.getFeedback())
                .allowReview(event.getAllowReview())
                .reviewDetails(reviewList)
                .build();
    }

    /**
     * Admin xem chi tiết toàn bộ bảng điểm và bài làm của một sự kiện
     */
    public List<TestEventRegistration> getEventRegistrationsAdmin(Long eventId) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID " + eventId));

        List<TestEventRegistration> allRegistrations = new ArrayList<>();
        if (event.getShifts() != null) {
            for (TestEventShift shift : event.getShifts()) {
                allRegistrations.addAll(registrationRepository.findByShiftIdOrderByRegisteredAtDesc(shift.getId()));
            }
        }
        return allRegistrations;
    }

    /**
     * So khớp đáp án của học viên với đáp án đúng (hỗ trợ nhiều biến thể qua '/' hoặc '|')
     */
    private boolean isAnswerCorrect(String studentAns, String rawCorrectAnswer) {
        if (studentAns == null || rawCorrectAnswer == null) {
            return false;
        }

        String cleanStudentAns = studentAns.trim().toLowerCase().replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "");
        if (cleanStudentAns.isEmpty()) {
            return false;
        }

        String[] acceptableAnswers = rawCorrectAnswer.split("[/|]");
        for (String ans : acceptableAnswers) {
            String cleanAns = ans.trim().toLowerCase().replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "");
            if (cleanStudentAns.equalsIgnoreCase(cleanAns)) {
                return true;
            }
        }
        return false;
    }
}
