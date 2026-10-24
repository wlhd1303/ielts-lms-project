package com.ielts.lms.config;

import com.ielts.lms.entity.User;
import com.ielts.lms.repository.UserRepository;
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

            // Đọc dữ liệu mẫu chuẩn từ TiDB (Lớp IELTS Luyện Đề: Reading Vol 3 Test 1 & Listening Test 1)
            com.fasterxml.jackson.databind.JsonNode readingNode = null;
            com.fasterxml.jackson.databind.JsonNode listeningNode = null;

            try (java.io.InputStream is = getClass().getResourceAsStream("/tidb_sample_data.json")) {
                if (is != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(is);
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

            // 3. Tạo/Cập nhật Kỳ Thi Thử Trực Tuyến TestEvent sao chép toàn bộ dữ liệu từ MockTest
            java.util.List<com.ielts.lms.booking.entity.TestEvent> existingEvents = eventRepository.findAll();
            com.ielts.lms.booking.entity.TestEvent targetEvent = null;

            for (com.ielts.lms.booking.entity.TestEvent ev : existingEvents) {
                if ("ONLINE".equalsIgnoreCase(ev.getExamFormat())) {
                    targetEvent = ev;
                    break;
                }
            }

            if (targetEvent == null) {
                targetEvent = new com.ielts.lms.booking.entity.TestEvent();
                targetEvent.setLocation("Phòng Thi Trực Tuyến (Online Exam Room)");
                targetEvent.setExamFormat("ONLINE");
                targetEvent.setSkillType("BOTH");
                targetEvent.setDurationMinutes(120);
                targetEvent.setAllowReview(true);
            }

            targetEvent.setTitle("Kỳ Thi Thử IELTS Online - " + rTitle + " & " + lTitle + " (Lớp Luyện Đề)");
            targetEvent.setDescription("Đề thi chính thức từ Lớp IELTS Luyện Đề (TiDB). Bao gồm: 40 câu Listening (" + lTitle + ") và 40 câu Reading (" + rTitle + "). Đề thi PDF Google Drive hỗ trợ Highlight tương tác trực tiếp (Ctrl + H) và tự động tính Band Score IELTS.");
            targetEvent.setPassageText(null);
            targetEvent.setEventDate(today);
            targetEvent.setStatus("OPEN");
            targetEvent.setPdfUrl(rPdf);
            targetEvent.setAudioUrl(lAudio);
            com.ielts.lms.booking.entity.TestEvent savedEvent = eventRepository.save(targetEvent);

            // Cập nhật ca thi
            if (savedEvent.getShifts() == null || savedEvent.getShifts().isEmpty()) {
                com.ielts.lms.booking.entity.TestEventShift shift1 = new com.ielts.lms.booking.entity.TestEventShift();
                shift1.setTestEvent(savedEvent);
                shift1.setShiftName("Ca Thi Hiện Tại (Vào Thi Ngay)");
                shift1.setStartTime(activeStartTime);
                shift1.setEndTime(activeEndTime);
                shift1.setMaxCapacity(100);
                shift1.setCurrentRegistered(0);

                com.ielts.lms.booking.entity.TestEventShift shift2 = new com.ielts.lms.booking.entity.TestEventShift();
                shift2.setTestEvent(savedEvent);
                shift2.setShiftName("Ca Thi Tiếp Theo (Phòng Chờ)");
                shift2.setStartTime(upcomingStartTime);
                shift2.setEndTime(upcomingEndTime);
                shift2.setMaxCapacity(50);
                shift2.setCurrentRegistered(0);

                shiftRepository.saveAll(java.util.List.of(shift1, shift2));
            } else {
                com.ielts.lms.booking.entity.TestEventShift s1 = savedEvent.getShifts().get(0);
                s1.setStartTime(activeStartTime);
                s1.setEndTime(activeEndTime);
                shiftRepository.save(s1);
            }

            // Tự động làm mới phiên thi cũ từ các ngày trước để tài khoản test luôn mở đề thi được ngay
            for (com.ielts.lms.booking.entity.TestEventShift sh : savedEvent.getShifts()) {
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

            // 4. Đồng bộ 40 câu hỏi Reading + 40 câu hỏi Listening vào test_event_questions
            eventQuestionRepository.deleteAll(eventQuestionRepository.findByTestEventIdOrderBySkillAscQuestionNumberAsc(savedEvent.getId()));

            java.util.List<com.ielts.lms.booking.entity.TestEventQuestion> eventQuestions = new java.util.ArrayList<>();

            // 40 câu Reading
            for (com.ielts.lms.entity.MockQuestion rq : mockQuestionRepository.findByMockTestId(mockReading.getId())) {
                com.ielts.lms.booking.entity.TestEventQuestion eq = new com.ielts.lms.booking.entity.TestEventQuestion();
                eq.setTestEvent(savedEvent);
                eq.setSkill("READING");
                eq.setQuestionNumber(rq.getQuestionNumber());
                eq.setQuestionText(rq.getQuestionText());
                eq.setCorrectAnswer(rq.getCorrectAnswer());
                eventQuestions.add(eq);
            }

            // 40 câu Listening
            for (com.ielts.lms.entity.MockQuestion lq : mockQuestionRepository.findByMockTestId(mockListening.getId())) {
                com.ielts.lms.booking.entity.TestEventQuestion eq = new com.ielts.lms.booking.entity.TestEventQuestion();
                eq.setTestEvent(savedEvent);
                eq.setSkill("LISTENING");
                eq.setQuestionNumber(lq.getQuestionNumber());
                eq.setQuestionText(lq.getQuestionText());
                eq.setCorrectAnswer(lq.getCorrectAnswer());
                eventQuestions.add(eq);
            }

            eventQuestionRepository.saveAll(eventQuestions);

            System.out.println(">>> [DataInitializer] Đã đồng bộ hoàn tất " + eventQuestions.size() 
                    + " câu hỏi chuẩn từ TiDB (40 Reading Lớp Luyện Đề + 40 Listening) cho Sự kiện thi Online ID " + savedEvent.getId());
            System.out.println(">>> PDF Google Drive Reading: " + rPdf);
            System.out.println(">>> Audio Cloudinary Listening: " + lAudio);
            System.out.println(">>> Ca thi 1 mở: " + activeStartTime + " - " + activeEndTime);
        };
    }
}
