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
import java.time.Duration;
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

    // Danh sách khung giờ chuẩn 30 phút trong ngày (mở tới 21h00, ca kết thúc 21h30)
    private static final String[][] STANDARD_SLOTS = {
        // Ca sáng (08:30 - 11:30)
        {"08:30", "09:00"},
        {"09:00", "09:30"},
        {"09:30", "10:00"},
        {"10:00", "10:30"},
        {"10:30", "11:00"},
        {"11:00", "11:30"},
        // Ca chiều (14:00 - 18:00)
        {"14:00", "14:30"},
        {"14:30", "15:00"},
        {"15:00", "15:30"},
        {"15:30", "16:00"},
        {"16:00", "16:30"},
        {"16:30", "17:00"},
        {"17:00", "17:30"},
        {"17:30", "18:00"},
        // Ca tối (18:30 - 21:30)
        {"18:30", "19:00"},
        {"19:00", "19:30"},
        {"19:30", "20:00"},
        {"20:00", "20:30"},
        {"20:30", "21:00"},
        {"21:00", "21:30"}
    };

    /**
     * Kiểm tra kỹ năng có hỗ trợ học nhóm tối đa 5 người không
     */
    public static boolean isGroupSkill(String skill) {
        if (skill == null) return false;
        String s = skill.trim().toUpperCase();
        return "READING".equals(s) || "LISTENING".equals(s) || "WRITING".equals(s);
    }

    /**
     * Sức chứa tối đa của ca học tùy theo kỹ năng
     */
    public static int getMaxCapacityForSkill(String skill) {
        return isGroupSkill(skill) ? 5 : 1;
    }

    /**
     * Lấy danh sách khung giờ 30 phút trong ngày kèm trạng thái Còn trống / Đã kín / Bạn đã book
     * Hỗ trợ hiển thị ca nhóm (Reading, Listening, Writing) tối đa 5 học viên
     */
    public List<AvailableSlotDto> getAvailableSlots(LocalDate date, User currentUser) {
        List<SupportBooking> existingBookings = bookingRepository.findByBookingDateAndStatusNot(date, "CANCELLED");
        List<ExternalDbSyncService.ExternalBusySlotDto> externalBusySlots = externalDbSyncService.getBusySlotsForDate(date);

        List<AvailableSlotDto> slots = new ArrayList<>();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        for (String[] slot : STANDARD_SLOTS) {
            String start = slot[0];
            String end = slot[1];

            List<SupportBooking> slotBookings = new ArrayList<>();
            boolean isBookedByMe = false;
            Long myBookingId = null;

            // Kiểm tra các booking thuộc slot này trên database chính
            for (SupportBooking b : existingBookings) {
                if (checkTimeOverlap(start, end, b.getStartTime(), b.getEndTime())) {
                    slotBookings.add(b);
                    if (currentUserId != null && b.getUser() != null && Objects.equals(b.getUser().getId(), currentUserId)) {
                        isBookedByMe = true;
                        myBookingId = b.getId();
                    }
                }
            }

            // Kiểm tra tiếp lịch bận của DB2 (nếu có kết nối)
            boolean isExternalBusy = false;
            for (ExternalDbSyncService.ExternalBusySlotDto extSlot : externalBusySlots) {
                if (checkTimeOverlap(start, end, extSlot.getStartTime(), extSlot.getEndTime())) {
                    isExternalBusy = true;
                    break;
                }
            }

            boolean isAvailable;
            String skill = null;
            Integer currentRegistered = 0;
            Integer maxCapacity = 1;
            Boolean isGroup = false;
            String taName = null;

            if (isExternalBusy) {
                isAvailable = false;
            } else if (slotBookings.isEmpty()) {
                isAvailable = true;
                currentRegistered = 0;
                maxCapacity = 1;
                isGroup = false;
            } else {
                SupportBooking first = slotBookings.get(0);
                skill = first.getSkill();
                taName = first.getAssignedTaName();
                isGroup = isGroupSkill(skill);
                maxCapacity = isGroup ? 5 : 1;
                currentRegistered = slotBookings.size();

                // Nếu là môn nhóm (Reading, Listening, Writing) và dưới 5 học viên thì vẫn còn chỗ cho học viên khác
                if (isGroup) {
                    isAvailable = currentRegistered < maxCapacity && !isBookedByMe;
                } else {
                    isAvailable = false;
                }
            }

            slots.add(AvailableSlotDto.builder()
                    .startTime(start)
                    .endTime(end)
                    .available(isAvailable)
                    .bookedByMe(isBookedByMe)
                    .bookingId(myBookingId)
                    .assignedTaName(taName)
                    .skill(skill)
                    .currentRegistered(currentRegistered)
                    .maxCapacity(maxCapacity)
                    .isGroup(isGroup)
                    .build());
        }

        return slots;
    }

    /**
     * Học viên đặt ca hỗ trợ 30 phút (cho phép slot chuẩn hoặc tùy chỉnh giờ linh động)
     * Kỹ năng Reading, Listening, Writing cho phép tối đa 5 bạn tham gia.
     * Khung giờ mở đến ca cuối cùng là 21:00 (kết thúc 21:30).
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

        // Kiểm tra khung giờ làm việc của trung tâm (Mở tới 21h00, ca muộn nhất kết thúc lúc 21h30)
        validateOperatingHours(startTime, endTime);

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
            boolean isGroup = isGroupSkill(dto.getSkill());
            if (!isGroup) {
                throw new RuntimeException("Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!");
            }

            // Với môn nhóm (READING, LISTENING, WRITING), tất cả các ca trong slot phải cùng môn
            for (SupportBooking existing : slotConflicts) {
                if (existing.getSkill() == null || !existing.getSkill().equalsIgnoreCase(dto.getSkill())) {
                    String existingSkill = existing.getSkill() != null ? existing.getSkill() : "khác";
                    throw new RuntimeException("Khung giờ này đang có ca hỗ trợ kỹ năng " + existingSkill + ". Môn nhóm chỉ ghép cùng kỹ năng!");
                }
            }

            // Giới hạn sĩ số nhóm tối đa 5 người
            if (slotConflicts.size() >= 5) {
                throw new RuntimeException("Ca hỗ trợ kỹ năng " + dto.getSkill() + " trong khung giờ này đã đủ 5 học viên. Vui lòng chọn khung giờ khác!");
            }
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

        // Nếu tham gia vào slot nhóm đã có Trợ giảng phụ trách thì tự động gán cùng Trợ giảng
        if (!slotConflicts.isEmpty() && (slotConflicts.get(0).getAssignedTaId() != null || slotConflicts.get(0).getAssignedTaName() != null)) {
            booking.setAssignedTaId(slotConflicts.get(0).getAssignedTaId());
            booking.setAssignedTaName(slotConflicts.get(0).getAssignedTaName());
        } else if (dto.getPreferredTaId() != null) {
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
     * Kiểm tra khung giờ làm việc:
     * - Sáng: 08:30 - 11:30
     * - Chiều: 14:00 - 18:00
     * - Tối: 18:30 - 21:30 (Mở ca muộn nhất là 21:00, kết thúc 21:30)
     */
    private void validateOperatingHours(String startTime, String endTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalTime start = LocalTime.parse(startTime, formatter);
        LocalTime end = LocalTime.parse(endTime, formatter);

        long durationMinutes = Duration.between(start, end).toMinutes();
        if (durationMinutes != 30) {
            throw new RuntimeException("Mỗi ca hỗ trợ có thời lượng chuẩn là 30 phút!");
        }

        LocalTime morningStart = LocalTime.of(8, 30);
        LocalTime morningEnd = LocalTime.of(11, 30);
        LocalTime afternoonStart = LocalTime.of(14, 0);
        LocalTime afternoonEnd = LocalTime.of(18, 0);
        LocalTime eveningStart = LocalTime.of(18, 30);
        LocalTime eveningEnd = LocalTime.of(21, 30);

        boolean inMorning = !start.isBefore(morningStart) && !end.isAfter(morningEnd);
        boolean inAfternoon = !start.isBefore(afternoonStart) && !end.isAfter(afternoonEnd);
        boolean inEvening = !start.isBefore(eveningStart) && !end.isAfter(eveningEnd);

        if (!inMorning && !inAfternoon && !inEvening) {
            throw new RuntimeException("Khung giờ đặt lịch phải nằm trong thời gian làm việc của Trợ giảng (Sáng: 08:30 - 11:30, Chiều: 14:00 - 18:00, Tối: 18:30 - 21:30. Ca muộn nhất bắt đầu lúc 21:00)!");
        }
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
