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

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestEventExamService {

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final TestEventRepository eventRepository;
    private final TestEventShiftRepository shiftRepository;
    private final TestEventRegistrationRepository registrationRepository;
    private final TestEventQuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    /**
     * Parse thời gian linh hoạt (chấp nhận "8:00", "08:00", "08:00:00")
     */
    public LocalTime parseFlexibleTime(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return LocalTime.of(0, 0);
        }
        String clean = timeStr.trim();
        String[] parts = clean.split(":");
        if (parts.length >= 2) {
            try {
                int h = Integer.parseInt(parts[0]);
                int m = Integer.parseInt(parts[1]);
                int s = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
                return LocalTime.of(h, m, s);
            } catch (NumberFormatException e) {
                log.warn("Lỗi parse giờ từ chuỗi {}: {}", clean, e.getMessage());
            }
        }
        return LocalTime.parse(clean);
    }

    /**
     * Xác định thời điểm mở và kết thúc cửa sổ cho phép học viên truy cập vào ca thi.
     * Cửa sổ mở từ startTime và kéo dài đến endTime của ca thi (hoặc tối thiểu 1 tiếng).
     */
    public LocalDateTime[] calculateExamWindow(TestEvent event, TestEventShift shift) {
        LocalTime startTime = parseFlexibleTime(shift.getStartTime());
        LocalDateTime windowStart = LocalDateTime.of(event.getEventDate(), startTime);

        LocalDateTime windowEnd;
        if (shift.getEndTime() != null && !shift.getEndTime().trim().isEmpty()) {
            LocalTime endTime = parseFlexibleTime(shift.getEndTime());
            windowEnd = LocalDateTime.of(event.getEventDate(), endTime);
            if (endTime.isBefore(startTime)) {
                // Ca thi xuyên đêm qua ngày hôm sau (ví dụ 23:00 -> 01:00)
                windowEnd = windowEnd.plusDays(1);
            }
        } else {
            windowEnd = windowStart.plusHours(1);
        }

        // Đảm bảo cửa sổ mở đề kéo dài ít nhất 1 tiếng tính từ giờ bắt đầu
        if (windowEnd.isBefore(windowStart.plusHours(1))) {
            windowEnd = windowStart.plusHours(1);
        }

        return new LocalDateTime[]{windowStart, windowEnd};
    }

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

        LocalDateTime serverTime = LocalDateTime.now(VN_ZONE);
        LocalDateTime[] window = calculateExamWindow(event, shift);
        LocalDateTime windowStart = window[0];
        LocalDateTime windowEnd = window[1];

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

            if (secondsRemaining <= -120) { // Hết giờ quá 2 phút buffer -> tự động thu bài và chuyển sang SUBMITTED
                if (registration.getExamSubmittedAt() == null) {
                    log.info("Tự động thu bài ca thi ID {} cho học viên ID {} do đã hết giờ làm bài", shiftId, registration.getUser().getId());
                    autoFinalizeExpiredExam(registration, event, shift);
                }
                return builder.status("SUBMITTED")
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

        LocalDateTime serverTime = LocalDateTime.now(VN_ZONE);
        LocalDateTime[] window = calculateExamWindow(event, shift);
        LocalDateTime windowStart = window[0];
        LocalDateTime windowEnd = window[1];

        // Nếu chưa bắt đầu làm bài thì kiểm tra cửa sổ ca thi
        if (registration.getExamStartedAt() == null) {
            if (serverTime.isBefore(windowStart)) {
                throw new RuntimeException("Chưa đến thời điểm mở đề thi! Vui lòng đợi đến " + shift.getStartTime());
            }
            if (serverTime.isAfter(windowEnd.plusMinutes(2))) {
                throw new RuntimeException("Đã quá thời hạn diễn ra ca thi! Cổng thi đã đóng.");
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
            if (registration.getExamSubmittedAt() == null) {
                autoFinalizeExpiredExam(registration, event, shift);
            }
            throw new RuntimeException("Phiên làm bài của bạn đã kết thúc và được nộp tự động. Vui lòng xem kết quả bài thi!");
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

        LocalDateTime serverTime = LocalDateTime.now(VN_ZONE);
        Map<String, String> studentAnswers = dto != null && dto.getAnswers() != null ? dto.getAnswers() : Collections.emptyMap();

        return gradeAndFinalizeRegistration(registration, event, shiftId, studentAnswers, serverTime);
    }

    /**
     * Tự động hoàn tất và chấm điểm khi phiên thi của học viên bị quá hạn (EXPIRED)
     */
    @Transactional
    public void autoFinalizeExpiredExam(TestEventRegistration registration, TestEvent event, TestEventShift shift) {
        if (registration.getExamSubmittedAt() != null) return;

        Map<String, String> studentAnswers = Collections.emptyMap();
        if (registration.getStudentAnswers() != null && !registration.getStudentAnswers().trim().isEmpty()) {
            try {
                studentAnswers = objectMapper.readValue(registration.getStudentAnswers(), new TypeReference<Map<String, String>>() {});
            } catch (Exception e) {
                log.error("Lỗi parse studentAnswers khi tự động thu bài", e);
            }
        }

        LocalDateTime startedAt = registration.getExamStartedAt() != null 
                ? registration.getExamStartedAt().toLocalDateTime() 
                : LocalDateTime.now(VN_ZONE);
        Integer duration = event.getDurationMinutes() != null ? event.getDurationMinutes() : 60;
        LocalDateTime deadline = startedAt.plusMinutes(duration);

        gradeAndFinalizeRegistration(registration, event, shift.getId(), studentAnswers, deadline);
    }

    /**
     * Chấm điểm và lưu kết quả bài thi cho bản ghi đăng ký
     */
    @Transactional
    public ExamSubmissionResultDto gradeAndFinalizeRegistration(
            TestEventRegistration registration,
            TestEvent event,
            Long shiftId,
            Map<String, String> studentAnswers,
            LocalDateTime submitTime) {

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
        registration.setExamSubmittedAt(Timestamp.valueOf(submitTime));
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
                .shiftName(registration.getShift() != null ? registration.getShift().getShiftName() : "")
                .skillType(skillType)
                .listeningCorrectCount(correctListening)
                .readingCorrectCount(correctReading)
                .scoreListening(bandListening)
                .scoreReading(bandReading)
                .overallScore(overallBand)
                .submittedAt(submitTime)
                .feedback(registration.getFeedback())
                .allowReview(event.getAllowReview())
                .reviewDetails(Boolean.TRUE.equals(event.getAllowReview()) ? reviewList : null)
                .build();
    }

    /**
     * Đặt lại lượt thi của học viên (cho phép thi lại từ đầu)
     */
    @Transactional
    public void resetExamRegistration(Long registrationId, User currentUser) {
        boolean isAdmin = currentUser != null && ("ROLE_ADMIN".equalsIgnoreCase(currentUser.getRole()) || "ADMIN".equalsIgnoreCase(currentUser.getRole()));
        TestEventRegistration reg = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đăng ký ID " + registrationId));

        if (!isAdmin && (reg.getUser() == null || !Objects.equals(reg.getUser().getId(), currentUser.getId()))) {
            throw new RuntimeException("Bạn không có quyền đặt lại lượt thi này!");
        }

        reg.setExamStartedAt(null);
        reg.setExamSubmittedAt(null);
        reg.setStudentAnswers(null);
        reg.setStatus("REGISTERED");
        reg.setListeningCorrectCount(null);
        reg.setReadingCorrectCount(null);
        reg.setScoreListening(null);
        reg.setScoreReading(null);
        reg.setScoreWriting(null);
        reg.setScoreSpeaking(null);
        reg.setOverallScore(null);
        registrationRepository.save(reg);
        log.info("Đã reset lượt thi đăng ký ID {} của học viên {}", registrationId, reg.getFullName());
    }

    /**
     * Người dùng tự reset lượt thi của mình trong ca thi (hỗ trợ Admin thi thử nhiều lần)
     */
    @Transactional
    public void resetMyExamInShift(Long shiftId, User currentUser) {
        TestEventRegistration reg = registrationRepository.findByShiftIdAndUserId(shiftId, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Bạn chưa đăng ký ca thi này!"));
        resetExamRegistration(reg.getId(), currentUser);
    }

    /**
     * Đặt lại toàn bộ lượt thi trong ca thi (Admin)
     */
    @Transactional
    public int resetAllRegistrationsInShift(Long shiftId, User currentUser) {
        boolean isAdmin = currentUser != null && ("ROLE_ADMIN".equalsIgnoreCase(currentUser.getRole()) || "ADMIN".equalsIgnoreCase(currentUser.getRole()));
        if (!isAdmin) {
            throw new RuntimeException("Chỉ Quản Trị Viên mới có quyền đặt lại toàn bộ ca thi!");
        }
        List<TestEventRegistration> regs = registrationRepository.findByShiftId(shiftId);
        for (TestEventRegistration reg : regs) {
            reg.setExamStartedAt(null);
            reg.setExamSubmittedAt(null);
            reg.setStudentAnswers(null);
            reg.setStatus("REGISTERED");
            reg.setListeningCorrectCount(null);
            reg.setReadingCorrectCount(null);
            reg.setScoreListening(null);
            reg.setScoreReading(null);
            reg.setScoreWriting(null);
            reg.setScoreSpeaking(null);
            reg.setOverallScore(null);
        }
        registrationRepository.saveAll(regs);
        log.info("Đã reset toàn bộ {} lượt thi trong ca thi ID {}", regs.size(), shiftId);
        return regs.size();
    }

    /**
     * Học viên tra cứu kết quả thi cá nhân (hoặc Admin xem kết quả của học viên)
     */
    public ExamSubmissionResultDto getMyExamResult(Long registrationId, User user) {
        TestEventRegistration reg = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đăng ký ID " + registrationId));

        // Kiểm tra quyền: chính chủ hoặc ADMIN (ROLE_ADMIN hoặc ADMIN)
        boolean isAdmin = user != null && ("ROLE_ADMIN".equalsIgnoreCase(user.getRole()) || "ADMIN".equalsIgnoreCase(user.getRole()));
        if (!isAdmin && (reg.getUser() == null || !Objects.equals(reg.getUser().getId(), user.getId()))) {
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

        // Admin luôn được xem chi tiết bài làm; học viên xem khi allowReview = true
        List<ExamSubmissionResultDto.QuestionReviewDetailDto> reviewList = null;
        if (isAdmin || Boolean.TRUE.equals(event.getAllowReview())) {
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
     * So khớp đáp án của học viên với đáp án đúng:
     * - Hỗ trợ nhiều biến thể qua '/' hoặc '|'
     * - Khử khoảng trắng thừa, viết hoa thường, dấu câu ở 2 đầu
     * - Hỗ trợ từ tùy chọn trong dấu ngoặc đơn, ví dụ "(the) bank" khớp cả "bank" và "the bank"
     */
    private boolean isAnswerCorrect(String studentAns, String rawCorrectAnswer) {
        if (studentAns == null || rawCorrectAnswer == null) {
            return false;
        }

        String cleanStudentAns = studentAns.trim().toLowerCase()
                .replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "")
                .replaceAll("\\s+", " ");
        if (cleanStudentAns.isEmpty()) {
            return false;
        }

        String[] acceptableAnswers = rawCorrectAnswer.split("[/|]");
        for (String ans : acceptableAnswers) {
            String trimmedAns = ans.trim().toLowerCase();

            // 1. So khớp trực tiếp chuẩn hóa
            String cleanAns = trimmedAns
                    .replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "")
                    .replaceAll("\\s+", " ");
            if (cleanStudentAns.equalsIgnoreCase(cleanAns)) {
                return true;
            }

            // 2. Hỗ trợ từ tùy chọn trong dấu ngoặc đơn: ví dụ "(the) bank", "bicycle(s)"
            if (trimmedAns.contains("(") && trimmedAns.contains(")")) {
                // Biến thể không lấy phần trong ngoặc: "(the) bank" -> "bank"
                String withoutBracket = trimmedAns.replaceAll("\\([^)]*\\)", "").trim()
                        .replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "")
                        .replaceAll("\\s+", " ");
                if (!withoutBracket.isEmpty() && cleanStudentAns.equalsIgnoreCase(withoutBracket)) {
                    return true;
                }

                // Biến thể lấy luôn phần trong ngoặc: "(the) bank" -> "the bank"
                String withBracketContent = trimmedAns.replace("(", "").replace(")", "").trim()
                        .replaceAll("^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "")
                        .replaceAll("\\s+", " ");
                if (!withBracketContent.isEmpty() && cleanStudentAns.equalsIgnoreCase(withBracketContent)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * BẢNG XẾP HẠNG ĐỢT THI THỬ (EVENT LEADERBOARD)
     */
    public EventLeaderboardDto getEventLeaderboard(Long eventId, Long shiftId, String skillFilter, User currentUser, boolean isAdmin) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID " + eventId));

        boolean isPublic = event.getIsLeaderboardPublic() != null ? event.getIsLeaderboardPublic() : true;
        String skill = skillFilter != null && !skillFilter.trim().isEmpty() ? skillFilter.toUpperCase().trim() : "OVERALL";

        if (!isPublic && !isAdmin) {
            EventLeaderboardItemDto myRankItem = null;
            if (currentUser != null) {
                List<TestEventRegistration> myRegs = registrationRepository.findByShiftTestEventId(eventId);
                for (TestEventRegistration reg : myRegs) {
                    if (reg.getUser() != null && Objects.equals(reg.getUser().getId(), currentUser.getId())) {
                        if (reg.getExamSubmittedAt() != null || "SUBMITTED".equals(reg.getStatus()) || "ATTENDED".equals(reg.getStatus())) {
                            myRankItem = mapToLeaderboardItem(reg, 0, currentUser, isAdmin);
                            break;
                        }
                    }
                }
            }

            return EventLeaderboardDto.builder()
                    .eventId(event.getId())
                    .eventTitle(event.getTitle())
                    .skillType(event.getSkillType())
                    .isPublic(false)
                    .totalParticipants(0)
                    .averageScore(0.0)
                    .highestScore(0.0)
                    .myRank(myRankItem)
                    .build();
        }

        List<TestEventRegistration> allRegistrations = registrationRepository.findByShiftTestEventId(eventId);

        List<TestEventRegistration> submittedList = allRegistrations.stream()
                .filter(reg -> reg.getExamSubmittedAt() != null || "SUBMITTED".equals(reg.getStatus()) || "ATTENDED".equals(reg.getStatus()))
                .filter(reg -> shiftId == null || (reg.getShift() != null && Objects.equals(reg.getShift().getId(), shiftId)))
                .collect(Collectors.toList());

        List<TestEventQuestion> eventQuestions = questionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(eventId);
        Map<String, int[]> questionStats = new HashMap<>();
        for (TestEventQuestion q : eventQuestions) {
            questionStats.put(q.getSkill().toUpperCase() + "_" + q.getQuestionNumber(), new int[]{0, 0});
        }

        for (TestEventRegistration reg : submittedList) {
            if (reg.getStudentAnswers() != null && !reg.getStudentAnswers().trim().isEmpty()) {
                try {
                    Map<String, String> ansMap = objectMapper.readValue(reg.getStudentAnswers(), new TypeReference<Map<String, String>>() {});
                    for (TestEventQuestion q : eventQuestions) {
                        String key = q.getSkill().toUpperCase() + "_" + q.getQuestionNumber();
                        int[] st = questionStats.get(key);
                        if (st != null) {
                            st[1]++;
                            String stdAns = ansMap.get(key);
                            if (stdAns == null) stdAns = ansMap.get(String.valueOf(q.getQuestionNumber()));
                            if (!isAnswerCorrect(stdAns, q.getCorrectAnswer())) {
                                st[0]++;
                            }
                        }
                    }
                } catch (Exception e) {
                    // Ignore parsing errors for stats
                }
            }
        }

        List<QuestionStatDto> topHardest = new ArrayList<>();
        for (TestEventQuestion q : eventQuestions) {
            String key = q.getSkill().toUpperCase() + "_" + q.getQuestionNumber();
            int[] st = questionStats.get(key);
            if (st != null && st[1] > 0) {
                double rate = (st[0] * 100.0) / st[1];
                topHardest.add(QuestionStatDto.builder()
                        .questionNumber(q.getQuestionNumber())
                        .skill(q.getSkill())
                        .wrongCount(st[0])
                        .totalAttempts(st[1])
                        .wrongRate(Math.round(rate * 10.0) / 10.0)
                        .build());
            }
        }
        topHardest.sort((a, b) -> Double.compare(b.getWrongRate(), a.getWrongRate()));
        if (topHardest.size() > 5) {
            topHardest = topHardest.subList(0, 5);
        }

        submittedList.sort((r1, r2) -> {
            double s1 = getScoreBySkill(r1, skill);
            double s2 = getScoreBySkill(r2, skill);
            if (Double.compare(s2, s1) != 0) {
                return Double.compare(s2, s1);
            }
            int c1 = getCorrectCountBySkill(r1, skill);
            int c2 = getCorrectCountBySkill(r2, skill);
            if (c2 != c1) {
                return Integer.compare(c2, c1);
            }
            int d1 = getDurationMinutes(r1, event.getDurationMinutes());
            int d2 = getDurationMinutes(r2, event.getDurationMinutes());
            if (d1 != d2) {
                return Integer.compare(d1, d2);
            }
            Timestamp t1 = r1.getExamSubmittedAt() != null ? r1.getExamSubmittedAt() : r1.getRegisteredAt();
            Timestamp t2 = r2.getExamSubmittedAt() != null ? r2.getExamSubmittedAt() : r2.getRegisteredAt();
            if (t1 != null && t2 != null) {
                return t1.compareTo(t2);
            }
            return 0;
        });

        List<EventLeaderboardItemDto> rankedItems = new ArrayList<>();
        EventLeaderboardItemDto myRankItem = null;
        double totalScoreSum = 0;
        double maxScore = 0;

        int currentRank = 1;
        for (int i = 0; i < submittedList.size(); i++) {
            TestEventRegistration reg = submittedList.get(i);
            double score = getScoreBySkill(reg, skill);
            totalScoreSum += score;
            if (score > maxScore) maxScore = score;

            EventLeaderboardItemDto item = mapToLeaderboardItem(reg, currentRank++, currentUser, isAdmin);
            rankedItems.add(item);

            if (currentUser != null && reg.getUser() != null && Objects.equals(reg.getUser().getId(), currentUser.getId())) {
                myRankItem = item;
            }
        }

        List<EventLeaderboardItemDto> topThree = rankedItems.stream().limit(3).collect(Collectors.toList());
        double avgScore = submittedList.isEmpty() ? 0.0 : Math.round((totalScoreSum / submittedList.size()) * 10.0) / 10.0;

        return EventLeaderboardDto.builder()
                .eventId(event.getId())
                .eventTitle(event.getTitle())
                .skillType(event.getSkillType())
                .isPublic(isPublic)
                .totalParticipants(submittedList.size())
                .averageScore(avgScore)
                .highestScore(maxScore)
                .topHardestQuestions(topHardest)
                .myRank(myRankItem)
                .topThree(topThree)
                .rankings(rankedItems)
                .build();
    }

    private double getScoreBySkill(TestEventRegistration reg, String skill) {
        if ("READING".equalsIgnoreCase(skill)) {
            return reg.getScoreReading() != null ? reg.getScoreReading() : 0.0;
        } else if ("LISTENING".equalsIgnoreCase(skill)) {
            return reg.getScoreListening() != null ? reg.getScoreListening() : 0.0;
        } else {
            if (reg.getOverallScore() != null) return reg.getOverallScore();
            if (reg.getScoreReading() != null && reg.getScoreListening() != null) {
                return (reg.getScoreReading() + reg.getScoreListening()) / 2.0;
            }
            if (reg.getScoreReading() != null) return reg.getScoreReading();
            if (reg.getScoreListening() != null) return reg.getScoreListening();
            return 0.0;
        }
    }

    private int getCorrectCountBySkill(TestEventRegistration reg, String skill) {
        int r = reg.getReadingCorrectCount() != null ? reg.getReadingCorrectCount() : 0;
        int l = reg.getListeningCorrectCount() != null ? reg.getListeningCorrectCount() : 0;
        if ("READING".equalsIgnoreCase(skill)) return r;
        if ("LISTENING".equalsIgnoreCase(skill)) return l;
        return r + l;
    }

    private int getDurationMinutes(TestEventRegistration reg, Integer fallbackDuration) {
        if (reg.getExamStartedAt() != null && reg.getExamSubmittedAt() != null) {
            long minutes = Duration.between(reg.getExamStartedAt().toLocalDateTime(), reg.getExamSubmittedAt().toLocalDateTime()).toMinutes();
            return (int) Math.max(1, minutes);
        }
        return fallbackDuration != null ? fallbackDuration : 60;
    }

    private EventLeaderboardItemDto mapToLeaderboardItem(TestEventRegistration reg, int rank, User currentUser, boolean isAdmin) {
        int rCount = reg.getReadingCorrectCount() != null ? reg.getReadingCorrectCount() : 0;
        int lCount = reg.getListeningCorrectCount() != null ? reg.getListeningCorrectCount() : 0;
        boolean isCurrent = currentUser != null && reg.getUser() != null && Objects.equals(reg.getUser().getId(), currentUser.getId());

        String name = reg.getFullName();
        if (name == null || name.trim().isEmpty()) {
            name = reg.getUser() != null ? reg.getUser().getFullName() : "Thí sinh";
        }

        return EventLeaderboardItemDto.builder()
                .rank(rank)
                .registrationId(reg.getId())
                .userId(reg.getUser() != null ? reg.getUser().getId() : null)
                .fullName(name)
                .username(reg.getUser() != null ? reg.getUser().getUsername() : "")
                .avatarUrl(null)
                .shiftId(reg.getShift() != null ? reg.getShift().getId() : null)
                .shiftName(reg.getShift() != null ? reg.getShift().getShiftName() : "")
                .scoreListening(reg.getScoreListening())
                .scoreReading(reg.getScoreReading())
                .scoreWriting(reg.getScoreWriting())
                .scoreSpeaking(reg.getScoreSpeaking())
                .overallScore(reg.getOverallScore())
                .correctCount(rCount + lCount)
                .totalQuestions(40)
                .durationMinutes(getDurationMinutes(reg, 60))
                .submittedAt(reg.getExamSubmittedAt())
                .phone(isAdmin ? reg.getPhone() : null)
                .email(isAdmin ? reg.getEmail() : null)
                .isCurrentUser(isCurrent)
                .build();
    }

    /**
     * Bật / Tắt công bố Bảng Xếp Hạng đợt thi
     */
    @Transactional
    public TestEvent toggleLeaderboardVisibility(Long eventId, Boolean isPublic) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID " + eventId));
        event.setIsLeaderboardPublic(isPublic != null ? isPublic : true);
        if (Boolean.TRUE.equals(event.getIsLeaderboardPublic())) {
            event.setLeaderboardPublishedAt(Timestamp.valueOf(LocalDateTime.now(VN_ZONE)));
        }
        return eventRepository.save(event);
    }

    /**
     * Chấm lại toàn bộ thí sinh trong sự kiện (khi cập nhật lại đề thi hoặc đáp án)
     */
    @Transactional
    public int regradeAllRegistrations(Long eventId) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID " + eventId));
        List<TestEventRegistration> allRegistrations = registrationRepository.findByShiftTestEventId(eventId);

        int count = 0;
        for (TestEventRegistration reg : allRegistrations) {
            if (reg.getStudentAnswers() != null && !reg.getStudentAnswers().trim().isEmpty()) {
                try {
                    Map<String, String> answers = objectMapper.readValue(reg.getStudentAnswers(), new TypeReference<Map<String, String>>() {});
                    LocalDateTime submitTime = reg.getExamSubmittedAt() != null 
                            ? reg.getExamSubmittedAt().toLocalDateTime() 
                            : LocalDateTime.now(VN_ZONE);
                    gradeAndFinalizeRegistration(reg, event, reg.getShift() != null ? reg.getShift().getId() : null, answers, submitTime);
                    count++;
                } catch (Exception e) {
                    log.error("Lỗi khi chấm lại bài thi cho thí sinh ID " + reg.getId(), e);
                }
            }
        }
        return count;
    }

    /**
     * Xuất danh sách bảng xếp hạng sang định dạng CSV (hỗ trợ tiếng Việt UTF-8 BOM cho Excel)
     */
    public byte[] exportLeaderboardCsv(Long eventId, Long shiftId) {
        EventLeaderboardDto leaderboard = getEventLeaderboard(eventId, shiftId, "OVERALL", null, true);
        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF");
        sb.append("Thứ hạng,Họ và tên,Tên tài khoản,Số điện thoại,Email,Ca thi,Số câu đúng,Thời gian làm bài (phút),Listening,Reading,Writing,Speaking,Overall Band,Thời điểm nộp bài\n");

        for (EventLeaderboardItemDto item : leaderboard.getRankings()) {
            sb.append(item.getRank()).append(",");
            sb.append("\"").append(item.getFullName() != null ? item.getFullName().replace("\"", "\"\"") : "").append("\",");
            sb.append("\"").append(item.getUsername() != null ? item.getUsername() : "").append("\",");
            sb.append("\"").append(item.getPhone() != null ? item.getPhone() : "").append("\",");
            sb.append("\"").append(item.getEmail() != null ? item.getEmail() : "").append("\",");
            sb.append("\"").append(item.getShiftName() != null ? item.getShiftName().replace("\"", "\"\"") : "").append("\",");
            sb.append(item.getCorrectCount() != null ? item.getCorrectCount() : 0).append(",");
            sb.append(item.getDurationMinutes() != null ? item.getDurationMinutes() : 0).append(",");
            sb.append(item.getScoreListening() != null ? item.getScoreListening() : "").append(",");
            sb.append(item.getScoreReading() != null ? item.getScoreReading() : "").append(",");
            sb.append(item.getScoreWriting() != null ? item.getScoreWriting() : "").append(",");
            sb.append(item.getScoreSpeaking() != null ? item.getScoreSpeaking() : "").append(",");
            sb.append(item.getOverallScore() != null ? item.getOverallScore() : "").append(",");
            sb.append(item.getSubmittedAt() != null ? item.getSubmittedAt().toString() : "").append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }
}
