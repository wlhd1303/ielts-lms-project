package com.ielts.lms.booking.controller;

import com.ielts.lms.booking.dto.RegisterEventShiftDto;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.service.TestEventService;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/booking/events")
@RequiredArgsConstructor
public class TestEventController {

    private final TestEventService eventService;
    private final com.ielts.lms.booking.service.TestEventExamService examService;
    private final UserService userService;

    /**
     * Danh sách sự kiện thi đang mở đăng ký
     */
    @GetMapping("/open")
    public ResponseEntity<List<TestEvent>> getOpenEvents() {
        return ResponseEntity.ok(eventService.getOpenEvents());
    }

    /**
     * Học viên đăng ký tham gia ca thi
     */
    @PostMapping("/register")
    public ResponseEntity<TestEventRegistration> registerShift(
            @Valid @RequestBody RegisterEventShiftDto dto) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(eventService.registerShift(dto, currentUser));
    }

    /**
     * Lấy các ca thi mà học viên hiện tại đã đăng ký kèm kết quả thi
     */
    @GetMapping("/my-registrations")
    public ResponseEntity<List<TestEventRegistration>> getMyRegistrations() {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(eventService.getMyRegistrations(currentUser));
    }

    /**
     * Hủy đăng ký ca thi trước hạn
     */
    @DeleteMapping("/registrations/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancelRegistration(@PathVariable Long id) {
        User currentUser = userService.getMyProfile();
        eventService.cancelRegistration(id, currentUser);
        return ResponseEntity.ok(Map.of("message", "Đã hủy đăng ký ca thi thành công!"));
    }

    /**
     * Kiểm tra trạng thái truy cập phòng thi (đếm ngược phòng chờ, kiểm tra khung giờ mở đề 1 tiếng)
     */
    @GetMapping("/shifts/{shiftId}/access-status")
    public ResponseEntity<com.ielts.lms.booking.dto.ExamAccessStatusDto> getExamAccessStatus(
            @PathVariable Long shiftId) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(examService.getExamAccessStatus(shiftId, currentUser));
    }

    /**
     * Học viên bấm Bắt đầu làm bài -> Kích hoạt đồng hồ tính giờ riêng và nhận đề thi
     */
    @PostMapping("/shifts/{shiftId}/start-exam")
    public ResponseEntity<com.ielts.lms.booking.dto.StartExamResponseDto> startExam(
            @PathVariable Long shiftId) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(examService.startExam(shiftId, currentUser));
    }

    /**
     * Học viên nộp bài thi -> Tự động chấm điểm và quy đổi Band Score IELTS
     */
    @PostMapping("/shifts/{shiftId}/submit-exam")
    public ResponseEntity<com.ielts.lms.booking.dto.ExamSubmissionResultDto> submitExam(
            @PathVariable Long shiftId,
            @RequestBody com.ielts.lms.booking.dto.SubmitEventExamDto dto) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(examService.submitExam(shiftId, dto, currentUser));
    }

    /**
     * Học viên xem kết quả bài thi cá nhân
     */
    @GetMapping("/registrations/{regId}/my-result")
    public ResponseEntity<com.ielts.lms.booking.dto.ExamSubmissionResultDto> getMyExamResult(
            @PathVariable Long regId) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(examService.getMyExamResult(regId, currentUser));
    }
}
