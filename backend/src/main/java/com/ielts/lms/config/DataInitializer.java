package com.ielts.lms.config;

import com.ielts.lms.entity.User;
import com.ielts.lms.repository.UserRepository;
import com.ielts.lms.booking.repository.TaAvailabilityRepository;
import com.ielts.lms.booking.service.BookingService;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initAdminAccount(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByUsername("admin_root").ifPresentOrElse(
                user -> {
                    boolean needsUpdate = false;
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        needsUpdate = true;
                    }
                    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                        user.setStatus("ACTIVE");
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        userRepository.save(user);
                        System.out.println(">>> [DataInitializer] Đã cập nhật quyền tài khoản admin_root thành ROLE_ADMIN và ACTIVE");
                    }
                },
                () -> {
                    User admin = new User();
                    admin.setUsername("admin_root");
                    admin.setPasswordHash(passwordEncoder.encode("admin123"));
                    admin.setFullName("Quản trị viên Hệ thống");
                    admin.setRole("ROLE_ADMIN");
                    admin.setStatus("ACTIVE");
                    userRepository.save(admin);
                    System.out.println(">>> [DataInitializer] Đã tự động tạo tài khoản admin_root (mật khẩu: admin123) với quyền ROLE_ADMIN");
                }
            );

            userRepository.findByUsername("admin11").ifPresentOrElse(
                user -> {
                    boolean needsUpdate = false;
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        needsUpdate = true;
                    }
                    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                        user.setStatus("ACTIVE");
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        userRepository.save(user);
                        System.out.println(">>> [DataInitializer] Đã cập nhật quyền tài khoản admin11 thành ROLE_ADMIN");
                    }
                },
                () -> {
                    User admin = new User();
                    admin.setUsername("admin11");
                    admin.setPasswordHash(passwordEncoder.encode("admin11"));
                    admin.setFullName("Super Administrator");
                    admin.setRole("ROLE_ADMIN");
                    admin.setStatus("ACTIVE");
                    userRepository.save(admin);
                    System.out.println(">>> [DataInitializer] Đã tự động tạo tài khoản super admin admin11 (mật khẩu: admin11) với quyền ROLE_ADMIN");
                }
            );
        };
    }

    @Bean
    public CommandLineRunner initSampleOnlineExam(
            com.ielts.lms.repository.MockTestRepository mockTestRepository,
            com.ielts.lms.repository.MockQuestionRepository mockQuestionRepository,
            com.ielts.lms.booking.repository.TestEventRepository eventRepository,
            com.ielts.lms.booking.repository.TestEventShiftRepository shiftRepository,
            com.ielts.lms.booking.repository.TestEventQuestionRepository eventQuestionRepository,
            com.ielts.lms.booking.repository.TestEventRegistrationRepository registrationRepository) {
        return args -> {
            java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
            java.time.LocalDate today = java.time.LocalDate.now(vnZone);
            java.time.LocalTime now = java.time.LocalTime.now(vnZone);

            int currentHour = now.getHour();
            String activeStartTime = String.format("%02d:00", Math.max(0, currentHour));
            String activeEndTime = String.format("%02d:30", Math.min(23, currentHour + 2));
            String upcomingStartTime = String.format("%02d:00", Math.min(23, currentHour + 2));
            String upcomingEndTime = String.format("%02d:30", Math.min(23, currentHour + 4));

            // Đọc dữ liệu mẫu chuẩn từ TiDB (Lớp IELTS Luyện Đề: Reading Vol 3 Test 1 & Listening Test 1, cùng 5 Kỳ thi Reading Nền)
            com.fasterxml.jackson.databind.JsonNode readingTestsNode = null;
            com.fasterxml.jackson.databind.JsonNode readingNode = null;
            com.fasterxml.jackson.databind.JsonNode listeningNode = null;

            try (java.io.InputStream is = getClass().getResourceAsStream("/tidb_sample_data.json")) {
                if (is != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(is);
                    if (root.has("readingTests") && root.get("readingTests").isArray()) {
                        readingTestsNode = root.get("readingTests");
                    }
                    readingNode = root.get("readingTest");
                    listeningNode = root.get("listeningTest");
                }
            } catch (Exception e) {
                System.err.println(">>> [DataInitializer] Lỗi khi nạp tidb_sample_data.json: " + e.getMessage());
            }

            String rTitle = readingNode != null && readingNode.has("title") ? readingNode.get("title").asText() : "Reading Vol 3 Test 1";
            String rPdf = readingNode != null && readingNode.has("pdfUrl") ? readingNode.get("pdfUrl").asText() : "https://drive.google.com/file/d/1tg4E0SJGrd9284lYXjiv5w76nkqdT0Kz/preview";

            String lTitle = listeningNode != null && listeningNode.has("title") ? listeningNode.get("title").asText() : "Ielts Listening Recent Actual Tests Vol 1 - Test 1";
            String lPdf = listeningNode != null && listeningNode.has("pdfUrl") ? listeningNode.get("pdfUrl").asText() : "https://drive.google.com/file/d/1iqUHpka-TQl9xLmC1VJvuVmKUNJZ21dB/preview";
            String lAudio = listeningNode != null && listeningNode.has("audioUrl") ? listeningNode.get("audioUrl").asText() : "https://res.cloudinary.com/aopi1xiw/video/upload/v1787231585/Ielts_Listening_Recent_Actual_Tests_Vol_1_-_Test_1.mp3";

            // 1. Tạo/Cập nhật MockTest Reading
            com.ielts.lms.entity.MockTest mockReading = mockTestRepository.findAll().stream()
                    .filter(mt -> "READING".equalsIgnoreCase(mt.getType()))
                    .findFirst()
                    .orElseGet(com.ielts.lms.entity.MockTest::new);

            mockReading.setTitle(rTitle);
            mockReading.setType("READING");
            mockReading.setPdfUrl(rPdf);
            mockReading = mockTestRepository.save(mockReading);

            if (readingNode != null && readingNode.has("questions")) {
                mockQuestionRepository.deleteAll(mockQuestionRepository.findByMockTestId(mockReading.getId()));
                java.util.List<com.ielts.lms.entity.MockQuestion> rQuestions = new java.util.ArrayList<>();
                for (com.fasterxml.jackson.databind.JsonNode qNode : readingNode.get("questions")) {
                    com.ielts.lms.entity.MockQuestion mq = new com.ielts.lms.entity.MockQuestion();
                    mq.setMockTest(mockReading);
                    mq.setQuestionNumber(qNode.get("questionNumber").asInt());
                    mq.setQuestionText(qNode.has("questionText") ? qNode.get("questionText").asText() : "Question " + mq.getQuestionNumber());
                    mq.setCorrectAnswer(qNode.has("correctAnswer") ? qNode.get("correctAnswer").asText() : "");
                    rQuestions.add(mq);
                }
                mockQuestionRepository.saveAll(rQuestions);
                System.out.println(">>> [DataInitializer] Đã đồng bộ " + rQuestions.size() + " câu hỏi Reading từ TiDB (Lớp IELTS Luyện Đề)");
            }

            // 2. Tạo/Cập nhật MockTest Listening
            com.ielts.lms.entity.MockTest mockListening = mockTestRepository.findAll().stream()
                    .filter(mt -> "LISTENING".equalsIgnoreCase(mt.getType()))
                    .findFirst()
                    .orElseGet(com.ielts.lms.entity.MockTest::new);

            mockListening.setTitle(lTitle);
            mockListening.setType("LISTENING");
            mockListening.setPdfUrl(lPdf);
            mockListening.setAudioUrl(lAudio);
            mockListening = mockTestRepository.save(mockListening);

            if (listeningNode != null && listeningNode.has("questions")) {
                mockQuestionRepository.deleteAll(mockQuestionRepository.findByMockTestId(mockListening.getId()));
                java.util.List<com.ielts.lms.entity.MockQuestion> lQuestions = new java.util.ArrayList<>();
                for (com.fasterxml.jackson.databind.JsonNode qNode : listeningNode.get("questions")) {
                    com.ielts.lms.entity.MockQuestion mq = new com.ielts.lms.entity.MockQuestion();
                    mq.setMockTest(mockListening);
                    mq.setQuestionNumber(qNode.get("questionNumber").asInt());
                    mq.setQuestionText(qNode.has("questionText") ? qNode.get("questionText").asText() : "Question " + mq.getQuestionNumber());
                    mq.setCorrectAnswer(qNode.has("correctAnswer") ? qNode.get("correctAnswer").asText() : "");
                    lQuestions.add(mq);
                }
                mockQuestionRepository.saveAll(lQuestions);
                System.out.println(">>> [DataInitializer] Đã đồng bộ " + lQuestions.size() + " câu hỏi Listening từ TiDB");
            }

            // 3. Dọn dẹp toàn bộ các kỳ thi test cũ
            java.util.List<com.ielts.lms.booking.entity.TestEvent> existingEvents = eventRepository.findAll();
            for (com.ielts.lms.booking.entity.TestEvent ev : existingEvents) {
                if ("dữ liệu test".equalsIgnoreCase(ev.getTitle()) 
                        || (ev.getTitle() != null && (ev.getTitle().contains("Reading Vol 3") || ev.getTitle().contains("Lớp Luyện Đề")))) {
                    try {
                        eventRepository.delete(ev);
                        System.out.println(">>> [DataInitializer] Đã xóa kỳ thi dữ liệu test cũ ID: " + ev.getId() + " - " + ev.getTitle());
                    } catch (Exception ex) {
                        System.err.println(">>> [DataInitializer] Lỗi khi xóa kỳ thi test cũ ID: " + ev.getId() + ": " + ex.getMessage());
                    }
                }
            }

            // 4. Đồng bộ 5 kỳ thi IELTS Reading Nền vào test_events, test_event_shifts, test_event_questions
            java.util.List<com.fasterxml.jackson.databind.JsonNode> testNodes = new java.util.ArrayList<>();
            if (readingTestsNode != null) {
                for (com.fasterxml.jackson.databind.JsonNode tn : readingTestsNode) {
                    testNodes.add(tn);
                }
            } else if (readingNode != null) {
                testNodes.add(readingNode);
            }

            for (com.fasterxml.jackson.databind.JsonNode tNode : testNodes) {
                Long tId = tNode.has("id") ? tNode.get("id").asLong() : null;
                String tTitle = tNode.has("title") ? tNode.get("title").asText() : "IELTS Academic Practice Examination • Reading Test";
                String tDesc = tNode.has("description") ? tNode.get("description").asText() : "";
                String tPdf = tNode.has("pdfUrl") ? tNode.get("pdfUrl").asText() : "";
                String tPassages = tNode.has("passageText") ? tNode.get("passageText").asText() : "";

                com.ielts.lms.booking.entity.TestEvent targetEvent = null;
                if (tId != null) {
                    targetEvent = eventRepository.findById(tId).orElse(null);
                }
                if (targetEvent == null) {
                    targetEvent = eventRepository.findAll().stream()
                            .filter(ev -> tTitle.equalsIgnoreCase(ev.getTitle()))
                            .findFirst()
                            .orElseGet(com.ielts.lms.booking.entity.TestEvent::new);
                }

                targetEvent.setTitle(tTitle);
                targetEvent.setDescription(tDesc);
                targetEvent.setLocation("Phòng Thi Trực Tuyến (Online Exam Room)");
                targetEvent.setExamFormat("ONLINE");
                targetEvent.setSkillType("READING");
                targetEvent.setDurationMinutes(60);
                targetEvent.setAllowReview(true);
                targetEvent.setIsPublished(true);
                targetEvent.setIsLeaderboardPublic(true);
                targetEvent.setEventDate(today);
                targetEvent.setStatus("OPEN");
                targetEvent.setPdfUrl(tPdf);
                targetEvent.setPassageText(tPassages);

                com.ielts.lms.booking.entity.TestEvent savedEvent = eventRepository.save(targetEvent);

                // Cập nhật ca thi trực tuyến mở cả ngày để học viên có thể vào thi bất kỳ lúc nào
                java.util.List<com.ielts.lms.booking.entity.TestEventShift> shifts = shiftRepository.findByTestEventId(savedEvent.getId());
                if (shifts == null || shifts.isEmpty()) {
                    com.ielts.lms.booking.entity.TestEventShift shift1 = new com.ielts.lms.booking.entity.TestEventShift();
                    shift1.setTestEvent(savedEvent);
                    shift1.setShiftName("Ca Thi Trực Tuyến (Vào Thi Ngay)");
                    shift1.setStartTime("00:00");
                    shift1.setEndTime("23:59");
                    shift1.setMaxCapacity(100);
                    shift1.setCurrentRegistered(0);
                    shiftRepository.save(shift1);
                } else {
                    com.ielts.lms.booking.entity.TestEventShift s1 = shifts.get(0);
                    s1.setShiftName("Ca Thi Trực Tuyến (Vào Thi Ngay)");
                    s1.setStartTime("00:00");
                    s1.setEndTime("23:59");
                    shiftRepository.save(s1);
                }

                // Tự động làm mới phiên thi cũ từ các ngày trước để tài khoản test luôn mở đề thi được ngay
                shifts = shiftRepository.findByTestEventId(savedEvent.getId());
                if (shifts != null) {
                    for (com.ielts.lms.booking.entity.TestEventShift sh : shifts) {
                        java.util.List<com.ielts.lms.booking.entity.TestEventRegistration> regs = registrationRepository.findByShiftId(sh.getId());
                        for (com.ielts.lms.booking.entity.TestEventRegistration reg : regs) {
                            if (reg.getExamStartedAt() != null && reg.getExamStartedAt().toLocalDateTime().toLocalDate().isBefore(today)) {
                                reg.setStatus("REGISTERED");
                                reg.setExamStartedAt(null);
                                reg.setExamSubmittedAt(null);
                                registrationRepository.save(reg);
                            }
                        }
                    }
                }

                // Đồng bộ chính xác 40 câu hỏi Reading vào test_event_questions
                if (tNode.has("questions") && tNode.get("questions").isArray()) {
                    eventQuestionRepository.deleteAll(eventQuestionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(savedEvent.getId()));

                    java.util.List<com.ielts.lms.booking.entity.TestEventQuestion> eventQuestions = new java.util.ArrayList<>();
                    for (com.fasterxml.jackson.databind.JsonNode qNode : tNode.get("questions")) {
                        com.ielts.lms.booking.entity.TestEventQuestion eq = new com.ielts.lms.booking.entity.TestEventQuestion();
                        eq.setTestEvent(savedEvent);
                        eq.setSkill("READING");
                        eq.setQuestionNumber(qNode.get("questionNumber").asInt());
                        eq.setQuestionText(qNode.has("questionText") ? qNode.get("questionText").asText() : "");
                        eq.setCorrectAnswer(qNode.has("correctAnswer") ? qNode.get("correctAnswer").asText() : "");
                        eventQuestions.add(eq);
                    }
                    eventQuestionRepository.saveAll(eventQuestions);
                    System.out.println(">>> [DataInitializer] Đã đồng bộ hoàn tất " + eventQuestions.size()
                            + " câu hỏi cho Sự kiện thi Online ID " + savedEvent.getId() + " - " + savedEvent.getTitle());
                }
            }
        };
    }

    @Bean
    public CommandLineRunner initTaSchedule(BookingService bookingService, TaAvailabilityRepository taAvailabilityRepository) {
        return args -> {
            try {
                LocalDate nextMonday = LocalDate.of(2026, 11, 16);
                bookingService.seedKhanhWeeklySchedule(nextMonday, null);
                System.out.println(">>> [DataInitializer] Đã chuẩn hóa & nạp 35 ca trực tuần tới cho Trợ giảng Khanh (16/11 - 22/11/2026)");
            } catch (Exception e) {
                System.err.println(">>> [DataInitializer] Lỗi khi khởi tạo lịch trực trợ giảng: " + e.getMessage());
            }
        };
    }
}
