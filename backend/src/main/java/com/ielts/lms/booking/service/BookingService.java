package com.ielts.lms.booking.service;

import com.ielts.lms.booking.dto.AvailableSlotDto;
import com.ielts.lms.booking.dto.CreateSupportBookingDto;
import com.ielts.lms.booking.dto.EvaluateBookingDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.repository.SupportBookingRepository;
import com.ielts.lms.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final SupportBookingRepository bookingRepository;
    private final ExternalDbSyncService externalDbSyncService;

    // Danh sách khung giờ chuẩn 30 phút trong ngày
    private static final String[][] STANDARD_SLOTS = {
        // Ca sáng
        {"08:30", "09:00"},
        {"09:00", "09:30"},
        {"09:30", "10:00"},
        {"10:00", "10:30"},
        {"10:30", "11:00"},
        {"11:00", "11:30"},
        // Ca chiều
        {"14:00", "14:30"},
        {"14:30", "15:00"},
        {"15:00", "15:30"},
        {"15:30", "16:00"},
        {"16:00", "16:30"},
        {"16:30", "17:00"},
        {"17:00", "17:30"},
        {"17:30", "18:00"},
        // Ca tối
        {"18:30", "19:00"},
        {"19:00", "19:30"},
        {"19:30", "20:00"},
        {"20:00", "20:30"}
    };

    /**
     * Lấy danh sách khung giờ 30 phút trong ngày kèm trạng thái Còn trống / Đã kín / Bạn đã book
     */
    public List<AvailableSlotDto> getAvailableSlots(LocalDate date, User currentUser) {
        List<SupportBooking> existingBookings = bookingRepository.findByBookingDateAndStatusNot(date, "CANCELLED");
        List<ExternalDbSyncService.ExternalBusySlotDto> externalBusySlots = externalDbSyncService.getBusySlotsForDate(date);

        List<AvailableSlotDto> slots = new ArrayList<>();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        for (String[] slot : STANDARD_SLOTS) {
            String start = slot[0];
            String end = slot[1];

            boolean isBooked = false;
            boolean isBookedByMe = false;
            Long myBookingId = null;
            String taName = null;

            // Kiểm tra trùng trên database chính của chúng ta
            for (SupportBooking b : existingBookings) {
                if (checkTimeOverlap(start, end, b.getStartTime(), b.getEndTime())) {
                    isBooked = true;
                    if (currentUserId != null && b.getUser() != null && Objects.equals(b.getUser().getId(), currentUserId)) {
                        isBookedByMe = true;
                        myBookingId = b.getId();
                    }
                    if (b.getAssignedTaName() != null) {
                        taName = b.getAssignedTaName();
                    }
                    break;
                }
            }

            // Nếu chưa bị trùng ở DB1, kiểm tra tiếp lịch bận của DB2 (nếu có kết nối)
            if (!isBooked) {
                for (ExternalDbSyncService.ExternalBusySlotDto extSlot : externalBusySlots) {
                    if (checkTimeOverlap(start, end, extSlot.getStartTime(), extSlot.getEndTime())) {
                        isBooked = true;
                        break;
                    }
                }
            }

            slots.add(AvailableSlotDto.builder()
                    .startTime(start)
                    .endTime(end)
                    .available(!isBooked)
                    .bookedByMe(isBookedByMe)
                    .bookingId(myBookingId)
                    .assignedTaName(taName)
                    .build());
        }

        return slots;
    }

    /**
     * Học viên đặt ca hỗ trợ 30 phút với cơ chế chống trùng giờ
     */
    @Transactional
    public SupportBooking bookSupportSession(CreateSupportBookingDto dto, User currentUser) {
        if (currentUser == null) {
            throw new RuntimeException("Bạn cần đăng nhập để đặt lịch hỗ trợ!");
        }

        LocalDate bookingDate = dto.getBookingDate();
        if (bookingDate == null || bookingDate.isBefore(LocalDate.now())) {
            throw new RuntimeException("Không thể đặt lịch cho ngày trong quá khứ!");
        }

        String startTime = dto.getStartTime().trim();
        String endTime = dto.getEndTime() != null && !dto.getEndTime().trim().isEmpty() 
                ? dto.getEndTime().trim() 
                : calculateEndTime(startTime, 30);

        if (startTime.compareTo(endTime) >= 0) {
            throw new RuntimeException("Giờ kết thúc phải sau giờ bắt đầu!");
        }

        // 1. Kiểm tra chính học viên này đã có ca nào trùng giờ trong ngày đó chưa
        List<SupportBooking> userConflicts = bookingRepository.findUserOverlappingBookings(
                currentUser.getId(), bookingDate, startTime, endTime
        );
        if (!userConflicts.isEmpty()) {
            throw new RuntimeException("Bạn đã có một ca hỗ trợ khác trùng vào khung giờ này (" + startTime + " - " + endTime + ")!");
        }

        // 2. Kiểm tra slot này đã có ai đặt trước chưa
        List<SupportBooking> slotConflicts = bookingRepository.findOverlappingBookings(bookingDate, startTime, endTime);
        if (!slotConflicts.isEmpty()) {
            throw new RuntimeException("Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!");
        }

        // 3. Kiểm tra DB bên kia nếu có
        List<ExternalDbSyncService.ExternalBusySlotDto> externalBusySlots = externalDbSyncService.getBusySlotsForDate(bookingDate);
        for (ExternalDbSyncService.ExternalBusySlotDto ext : externalBusySlots) {
            if (checkTimeOverlap(startTime, endTime, ext.getStartTime(), ext.getEndTime())) {
                throw new RuntimeException("Khung giờ này Trợ giảng đã có lịch bận. Vui lòng chọn khung giờ khác!");
            }
        }

        SupportBooking booking = new SupportBooking();
        booking.setUser(currentUser);
        booking.setBookingDate(bookingDate);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setSkill(dto.getSkill());
        booking.setStudentNote(dto.getStudentNote());
        booking.setStatus("CONFIRMED");

        if (dto.getPreferredTaId() != null) {
            booking.setAssignedTaId(dto.getPreferredTaId());
        }

        SupportBooking savedBooking = bookingRepository.save(booking);

        // Đồng bộ 2 chiều sang database web quản lý (Supabase DB 2)
        try {
            String externalId = externalDbSyncService.syncSupportSessionToExternalDb(savedBooking);
            if (externalId != null) {
                savedBooking.setExternalSessionId(externalId);
                savedBooking = bookingRepository.save(savedBooking);
            }
        } catch (Exception e) {
            log.warn("Không thể đồng bộ buổi hỗ trợ sang DB 2: {}", e.getMessage());
        }

        return savedBooking;
    }

    /**
     * Hủy ca đã đặt
     */
    @Transactional
    public void cancelBooking(Long bookingId, User currentUser) {
        SupportBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca hỗ trợ!"));

        boolean isAdmin = currentUser != null && ("ROLE_ADMIN".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()));
        boolean isOwner = currentUser != null && booking.getUser() != null && Objects.equals(booking.getUser().getId(), currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Bạn không có quyền hủy ca hỗ trợ này!");
        }

        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);

        // Đồng bộ trạng thái hủy sang DB 2
        if (booking.getExternalSessionId() != null) {
            try {
                externalDbSyncService.cancelExternalSupportSession(booking.getExternalSessionId());
            } catch (Exception e) {
                log.warn("Không thể hủy ca hỗ trợ trên DB 2: {}", e.getMessage());
            }
        }
    }

    /**
     * Lấy lịch sử ca hỗ trợ của học viên
     */
    public List<SupportBooking> getMyBookings(User currentUser) {
        if (currentUser == null) {
            return new ArrayList<>();
        }
        List<SupportBooking> bookings = bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(currentUser.getId());
        try {
            externalDbSyncService.pullExternalSessionUpdates(bookings);
        } catch (Exception ignored) {}
        return bookings;
    }

    /**
     * Lấy toàn bộ ca hỗ trợ cho Admin / Giảng viên
     */
    public List<SupportBooking> getAllBookingsAdmin() {
        List<SupportBooking> bookings = bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc();
        try {
            externalDbSyncService.pullExternalSessionUpdates(bookings);
        } catch (Exception ignored) {}
        return bookings;
    }

    /**
     * Trợ giảng / Giáo viên điểm danh và nhận xét sau buổi hỗ trợ
     */
    @Transactional
    public SupportBooking evaluateBooking(Long bookingId, EvaluateBookingDto dto) {
        SupportBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca hỗ trợ!"));

        if (dto.getIsPresent() != null) {
            booking.setIsPresent(dto.getIsPresent());
        }
        if (dto.getAbsenceReason() != null) {
            booking.setAbsenceReason(dto.getAbsenceReason());
        }
        if (dto.getScore() != null) {
            booking.setScore(dto.getScore());
        }
        if (dto.getTaComment() != null) {
            booking.setTaComment(dto.getTaComment());
        }
        if (dto.getAssignedTaName() != null) {
            booking.setAssignedTaName(dto.getAssignedTaName());
        }

        booking.setStatus("COMPLETED");
        booking.setEvaluatedAt(new Timestamp(System.currentTimeMillis()));

        SupportBooking saved = bookingRepository.save(booking);

        // Đồng bộ chấm điểm/đánh giá sang DB 2
        if (saved.getExternalSessionId() != null) {
            try {
                externalDbSyncService.syncEvaluationToExternalDb(saved);
            } catch (Exception e) {
                log.warn("Không thể đồng bộ chấm điểm sang DB 2: {}", e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Thuật toán kiểm tra giao nhau giữa 2 khoảng thời gian (format HH:mm)
     */
    private boolean checkTimeOverlap(String startA, String endA, String startB, String endB) {
        return startA.compareTo(endB) < 0 && endA.compareTo(startB) > 0;
    }

    /**
     * Cộng thêm phút vào giờ bắt đầu để tạo giờ kết thúc chuẩn 30 phút
     */
    private String calculateEndTime(String startTime, int durationMinutes) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalTime time = LocalTime.parse(startTime, formatter);
        LocalTime endTime = time.plusMinutes(durationMinutes);
        return endTime.format(formatter);
    }
}
