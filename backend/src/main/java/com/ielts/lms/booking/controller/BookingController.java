package com.ielts.lms.booking.controller;

import com.ielts.lms.booking.dto.AvailableSlotDto;
import com.ielts.lms.booking.dto.CreateSupportBookingDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.booking.service.ExternalDbSyncService;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/booking/support")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final UserService userService;
    private final ExternalDbSyncService externalDbSyncService;

    /**
     * Lấy các khung giờ 30 phút khả dụng trong ngày
     */
    @GetMapping("/slots")
    public ResponseEntity<List<AvailableSlotDto>> getAvailableSlots(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(bookingService.getAvailableSlots(date, currentUser));
    }

    /**
     * Học viên tự đặt ca hỗ trợ 30 phút
     */
    @PostMapping("/book")
    public ResponseEntity<SupportBooking> bookSupportSession(
            @Valid @RequestBody CreateSupportBookingDto dto) {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(bookingService.bookSupportSession(dto, currentUser));
    }

    /**
     * Xem lịch sử các ca hỗ trợ đã đặt của học viên
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<List<SupportBooking>> getMyBookings() {
        User currentUser = userService.getMyProfile();
        return ResponseEntity.ok(bookingService.getMyBookings(currentUser));
    }

    /**
     * Hủy ca đã đặt trước hạn
     */
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancelBooking(@PathVariable Long id) {
        User currentUser = userService.getMyProfile();
        bookingService.cancelBooking(id, currentUser);
        return ResponseEntity.ok(Map.of("message", "Đã hủy ca hỗ trợ thành công!"));
    }

    /**
     * Lấy danh sách Trợ giảng từ hệ thống
     */
    @GetMapping("/teaching-assistants")
    public ResponseEntity<List<ExternalDbSyncService.ExternalTaDto>> getTeachingAssistants() {
        return ResponseEntity.ok(externalDbSyncService.getTeachingAssistants());
    }
}
