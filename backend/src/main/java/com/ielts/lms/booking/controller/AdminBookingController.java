package com.ielts.lms.booking.controller;

import com.ielts.lms.booking.dto.CreateTestEventDto;
import com.ielts.lms.booking.dto.EvaluateBookingDto;
import com.ielts.lms.booking.dto.UpdateShiftScoreDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.booking.service.TestEventService;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/booking")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingService bookingService;
    private final TestEventService eventService;
    private final UserService userService;

    /**
     * Xem toàn bộ ca hỗ trợ
     */
    @GetMapping("/support")
    public ResponseEntity<List<SupportBooking>> getAllSupportBookings() {
        return ResponseEntity.ok(bookingService.getAllBookingsAdmin());
    }

    /**
     * Đánh giá / Chấm điểm ca hỗ trợ
     */
    @PutMapping("/support/{id}/evaluate")
    public ResponseEntity<SupportBooking> evaluateSupportBooking(
            @PathVariable Long id,
            @RequestBody EvaluateBookingDto dto) {
        return ResponseEntity.ok(bookingService.evaluateBooking(id, dto));
    }

    /**
     * Xem toàn bộ sự kiện thi
     */
    @GetMapping("/events")
    public ResponseEntity<List<TestEvent>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEventsAdmin());
    }

    /**
     * Tạo sự kiện thi và chia ca
     */
    @PostMapping("/events")
    public ResponseEntity<TestEvent> createEvent(
            @Valid @RequestBody CreateTestEventDto dto) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(eventService.createEvent(dto, currentUser));
    }

    /**
     * Cập nhật thông tin đợt thi thử và ca thi
     */
    @PutMapping("/events/{id}")
    public ResponseEntity<TestEvent> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody CreateTestEventDto dto) {
        return ResponseEntity.ok(eventService.updateEvent(id, dto));
    }

    /**
     * Xóa đợt thi thử và dữ liệu liên quan
     */
    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Xem danh sách học viên đăng ký theo từng ca
     */
    @GetMapping("/events/shifts/{shiftId}/students")
    public ResponseEntity<List<TestEventRegistration>> getShiftStudents(@PathVariable Long shiftId) {
        return ResponseEntity.ok(eventService.getShiftRegistrations(shiftId));
    }

    /**
     * Nhập điểm thi / Điểm danh cho học viên trong ca thi
     */
    @PutMapping("/events/registrations/{regId}/score")
    public ResponseEntity<TestEventRegistration> updateStudentScore(
            @PathVariable Long regId,
            @RequestBody UpdateShiftScoreDto dto) {
        return ResponseEntity.ok(eventService.updateRegistrationScore(regId, dto));
    }
}
