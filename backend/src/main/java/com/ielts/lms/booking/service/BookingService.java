package com.ielts.lms.booking.service;

import com.ielts.lms.booking.dto.AvailableSlotDto;
import com.ielts.lms.booking.dto.BatchTaAvailabilityDto;
import com.ielts.lms.booking.dto.CopyWeekAvailabilityDto;
import com.ielts.lms.booking.dto.CreateSupportBookingDto;
import com.ielts.lms.booking.dto.EvaluateBookingDto;
import com.ielts.lms.booking.dto.TaSlotRequestDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.entity.TaAvailability;
import com.ielts.lms.booking.repository.SupportBookingRepository;
import com.ielts.lms.booking.repository.TaAvailabilityRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final SupportBookingRepository bookingRepository;
    private final ExternalDbSyncService externalDbSyncService;
    private final TaAvailabilityRepository taAvailabilityRepository;

    // Danh sách khung giờ chuẩn 30 phút trong ngày (chỉ mở từ 17h00 đến 21h30, ca muộn nhất mở lúc 21h00)
    private static final String[][] STANDARD_SLOTS = {
        {"17:00", "17:30"},
        {"17:30", "18:00"},
        {"18:00", "18:30"},
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
     * Lọc CHÍNH XÁC theo các ca rảnh đã được Trợ giảng mở (TaAvailability).
     * Nếu ngày không có Trợ giảng nào mở lịch, trả về rỗng để chặn đăng ký vô tội vạ.
     */
    public List<AvailableSlotDto> getAvailableSlots(LocalDate date, User currentUser) {
        List<TaAvailability> taSlots = taAvailabilityRepository != null
                ? taAvailabilityRepository.findByAvailableDateAndStatusNotOrderByStartTimeAsc(date, "CANCELLED")
                : Collections.emptyList();

        List<SupportBooking> existingBookings = bookingRepository.findByBookingDateAndStatusNot(date, "CANCELLED");
        List<SupportBooking> cancelledBookings = bookingRepository.findByBookingDateAndStatus(date, "CANCELLED");
        List<ExternalDbSyncService.ExternalBusySlotDto> externalBusySlots = externalDbSyncService != null
                ? externalDbSyncService.getBusySlotsForDate(date)
                : Collections.emptyList();

        List<AvailableSlotDto> slots = new ArrayList<>();
        Long currentUserId = currentUser != null ? currentUser.getId() : null;

        // 1. NẾU NGÀY CÓ TRỢ GIẢNG MỞ LỊCH RẢNH (Chế độ chính)
        if (taSlots != null && !taSlots.isEmpty()) {
            for (TaAvailability taSlot : taSlots) {
                String start = taSlot.getStartTime();
                String end = taSlot.getEndTime();
                String taId = taSlot.getTaId();
                String taName = taSlot.getTaName();

                List<SupportBooking> slotBookings = new ArrayList<>();
                boolean isBookedByMe = false;
                Long myBookingId = null;

                for (SupportBooking b : existingBookings) {
                    boolean matches = (b.getAvailabilityId() != null && Objects.equals(b.getAvailabilityId(), taSlot.getId()))
                            || (checkTimeOverlap(start, end, b.getStartTime(), b.getEndTime()) &&
                                (b.getAssignedTaId() == null || Objects.equals(b.getAssignedTaId(), taId)));
                    if (matches) {
                        slotBookings.add(b);
                        if (currentUserId != null && b.getUser() != null && Objects.equals(b.getUser().getId(), currentUserId)) {
                            isBookedByMe = true;
                            myBookingId = b.getId();
                        }
                    }
                }

                boolean isExternalBusy = false;
                for (ExternalDbSyncService.ExternalBusySlotDto extSlot : externalBusySlots) {
                    if (checkTimeOverlap(start, end, extSlot.getStartTime(), extSlot.getEndTime()) &&
                        (extSlot.getTaId() == null || Objects.equals(extSlot.getTaId(), taId))) {
                        isExternalBusy = true;
                        break;
                    }
                }

                int currentRegistered = slotBookings.size();
                int maxCapacity = taSlot.getMaxCapacity() != null && taSlot.getMaxCapacity() > 0 ? taSlot.getMaxCapacity() : 1;
                boolean isGroup = isGroupSkill(taSlot.getSkill()) || maxCapacity > 1;

                boolean isAvailable = !isExternalBusy &&
                        !"FULL".equalsIgnoreCase(taSlot.getStatus()) &&
                        (currentRegistered < maxCapacity) &&
                        !isBookedByMe;

                slots.add(AvailableSlotDto.builder()
                        .availabilityId(taSlot.getId())
                        .taId(taId)
                        .assignedTaName(taName)
                        .startTime(start)
                        .endTime(end)
                        .available(isAvailable)
                        .bookedByMe(isBookedByMe)
                        .bookingId(myBookingId)
                        .skill(taSlot.getSkill())
                        .note(taSlot.getNote())
                        .currentRegistered(currentRegistered)
                        .maxCapacity(maxCapacity)
                        .isGroup(isGroup)
                        .build());
            }
            return slots;
        }

        // 2. NẾU NGÀY NÀY KHÔNG CÓ TRỢ GIẢNG NÀO MỞ CA:
        // Trả về rỗng để học viên không thể đặt vô tội vạ khi không có người trực.
        return Collections.emptyList();
    }

    /**
     * Học viên đặt ca hỗ trợ 30 phút theo lịch rảnh thực tế của Trợ giảng
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

        // 0. Xác thực và gắn thông tin từ slot rảnh của Trợ giảng (TaAvailability)
        TaAvailability taSlot = null;
        if (dto.getAvailabilityId() != null && taAvailabilityRepository != null) {
            taSlot = taAvailabilityRepository.findById(dto.getAvailabilityId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ca rảnh của Trợ giảng!"));
            if ("CANCELLED".equalsIgnoreCase(taSlot.getStatus())) {
                throw new RuntimeException("Ca rảnh này đã bị hủy bởi Trợ giảng!");
            }
            if ("FULL".equalsIgnoreCase(taSlot.getStatus())) {
                throw new RuntimeException("Ca hỗ trợ này đã kín chỗ!");
            }
            bookingDate = taSlot.getAvailableDate();
            dto.setBookingDate(bookingDate);
            dto.setStartTime(taSlot.getStartTime());
            dto.setEndTime(taSlot.getEndTime());
            dto.setPreferredTaId(taSlot.getTaId());
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

        // Nếu không truyền availabilityId, tìm xem ngày này có mở ca rảnh nào khớp không
        if (taSlot == null && taAvailabilityRepository != null) {
            List<TaAvailability> daySlots = taAvailabilityRepository.findByAvailableDateAndStatusNotOrderByStartTimeAsc(bookingDate, "CANCELLED");
            if (!daySlots.isEmpty()) {
                for (TaAvailability s : daySlots) {
                    if (s.getStartTime().equals(startTime) && s.getEndTime().equals(endTime) &&
                        (dto.getPreferredTaId() == null || Objects.equals(s.getTaId(), dto.getPreferredTaId()))) {
                        taSlot = s;
                        break;
                    }
                }
                if (taSlot == null) {
                    throw new RuntimeException("Khung giờ bạn chọn không nằm trong lịch rảnh của Trợ giảng! Vui lòng chọn ca có sẵn.");
                }
            }
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
        if (taSlot != null) {
            final Long targetAvailId = taSlot.getId();
            final String targetTaId = taSlot.getTaId();
            slotConflicts = slotConflicts.stream()
                    .filter(b -> Objects.equals(b.getAvailabilityId(), targetAvailId) ||
                                 (b.getAssignedTaId() == null || Objects.equals(b.getAssignedTaId(), targetTaId)))
                    .toList();
        }

        int maxCapacity = taSlot != null && taSlot.getMaxCapacity() != null ? taSlot.getMaxCapacity() : (isGroupSkill(dto.getSkill()) ? 5 : 1);
        boolean isGroup = maxCapacity > 1 || isGroupSkill(dto.getSkill());

        if (!slotConflicts.isEmpty()) {
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

            // Giới hạn sĩ số nhóm tối đa
            if (slotConflicts.size() >= maxCapacity) {
                if (taSlot != null && taAvailabilityRepository != null) {
                    taSlot.setStatus("FULL");
                    taAvailabilityRepository.save(taSlot);
                }
                throw new RuntimeException("Ca hỗ trợ kỹ năng " + dto.getSkill() + " trong khung giờ này đã đủ " + maxCapacity + " học viên. Vui lòng chọn khung giờ khác!");
            }
        }

        // 3. Kiểm tra DB bên kia nếu có
        List<ExternalDbSyncService.ExternalBusySlotDto> externalBusySlots = externalDbSyncService != null
                ? externalDbSyncService.getBusySlotsForDate(bookingDate)
                : Collections.emptyList();
        String targetTaId = taSlot != null ? taSlot.getTaId() : dto.getPreferredTaId();
        for (ExternalDbSyncService.ExternalBusySlotDto ext : externalBusySlots) {
            if (checkTimeOverlap(startTime, endTime, ext.getStartTime(), ext.getEndTime()) &&
                (targetTaId == null || ext.getTaId() == null || Objects.equals(ext.getTaId(), targetTaId))) {
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

        // Gán thông tin Trợ giảng phụ trách
        if (taSlot != null) {
            booking.setAvailabilityId(taSlot.getId());
            booking.setAssignedTaId(taSlot.getTaId());
            booking.setAssignedTaName(taSlot.getTaName());
        } else if (!slotConflicts.isEmpty() && (slotConflicts.get(0).getAssignedTaId() != null || slotConflicts.get(0).getAssignedTaName() != null)) {
            booking.setAssignedTaId(slotConflicts.get(0).getAssignedTaId());
            booking.setAssignedTaName(slotConflicts.get(0).getAssignedTaName());
        } else if (dto.getPreferredTaId() != null) {
            booking.setAssignedTaId(dto.getPreferredTaId());
        }

        SupportBooking savedBooking = bookingRepository.save(booking);

        // Cập nhật trạng thái FULL nếu đã đủ chỗ
        if (taSlot != null && taAvailabilityRepository != null && (slotConflicts.size() + 1 >= maxCapacity)) {
            taSlot.setStatus("FULL");
            taAvailabilityRepository.save(taSlot);
        }

        // Đồng bộ 2 chiều sang database web quản lý (Supabase DB 2)
        try {
            if (externalDbSyncService != null) {
                String externalId = externalDbSyncService.syncSupportSessionToExternalDb(savedBooking);
                if (externalId != null) {
                    savedBooking.setExternalSessionId(externalId);
                    savedBooking = bookingRepository.save(savedBooking);
                }
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

        // Mở lại slot rảnh của Trợ giảng nếu slot này trước đó bị đầy (FULL)
        if (booking.getAvailabilityId() != null && taAvailabilityRepository != null) {
            taAvailabilityRepository.findById(booking.getAvailabilityId()).ifPresent(slot -> {
                if ("FULL".equalsIgnoreCase(slot.getStatus())) {
                    slot.setStatus("OPEN");
                    taAvailabilityRepository.save(slot);
                }
            });
        }

        // Đồng bộ trạng thái hủy sang DB 2 (hỗ trợ cả UUID và Fallback theo ngày/giờ)
        try {
            if (externalDbSyncService != null) {
                externalDbSyncService.cancelExternalSupportSession(booking);
            }
        } catch (Exception e) {
            log.warn("Không thể hủy ca hỗ trợ trên DB 2: {}", e.getMessage());
        }
    }

    /**
     * Xóa hoàn toàn ca hỗ trợ (dành cho Admin hoặc chủ ca)
     * Đồng bộ xóa cứng trên DB 2
     */
    @Transactional
    public void deleteBooking(Long bookingId, User currentUser) {
        SupportBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca hỗ trợ!"));

        boolean isAdmin = currentUser != null && ("ROLE_ADMIN".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()));
        boolean isOwner = currentUser != null && booking.getUser() != null && Objects.equals(booking.getUser().getId(), currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Bạn không có quyền xóa ca hỗ trợ này!");
        }

        // Mở lại slot rảnh nếu cần
        if (booking.getAvailabilityId() != null && taAvailabilityRepository != null) {
            taAvailabilityRepository.findById(booking.getAvailabilityId()).ifPresent(slot -> {
                if ("FULL".equalsIgnoreCase(slot.getStatus())) {
                    slot.setStatus("OPEN");
                    taAvailabilityRepository.save(slot);
                }
            });
        }

        // Đồng bộ xóa cứng sang DB 2 (hỗ trợ cả UUID và Fallback theo ngày/giờ)
        try {
            if (externalDbSyncService != null) {
                externalDbSyncService.deleteExternalSupportSession(booking);
            }
        } catch (Exception e) {
            log.warn("Không thể xóa ca hỗ trợ trên DB 2: {}", e.getMessage());
        }

        bookingRepository.delete(booking);
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
            boolean changed = externalDbSyncService.pullExternalSessionUpdates(bookings);
            if (changed) {
                bookingRepository.saveAll(bookings);
            }
        } catch (Exception ignored) {}
        return bookings;
    }

    /**
     * Lấy toàn bộ ca hỗ trợ cho Admin / Giảng viên
     */
    public List<SupportBooking> getAllBookingsAdmin() {
        List<SupportBooking> bookings = bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc();
        try {
            boolean changed = externalDbSyncService.pullExternalSessionUpdates(bookings);
            if (changed) {
                bookingRepository.saveAll(bookings);
            }
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
     * - Chỉ mở từ 17:00 đến 21:30 (Ca mở muộn nhất là 21:00, kết thúc lúc 21:30)
     */
    private void validateOperatingHours(String startTime, String endTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalTime start = LocalTime.parse(startTime, formatter);
        LocalTime end = LocalTime.parse(endTime, formatter);

        long durationMinutes = Duration.between(start, end).toMinutes();
        if (durationMinutes != 30) {
            throw new RuntimeException("Mỗi ca hỗ trợ có thời lượng chuẩn là 30 phút!");
        }

        LocalTime openStart = LocalTime.of(17, 0);
        LocalTime openEnd = LocalTime.of(21, 30);

        boolean inOperatingHours = !start.isBefore(openStart) && !end.isAfter(openEnd);

        if (!inOperatingHours) {
            throw new RuntimeException("Khung giờ đặt lịch chỉ mở từ 17:00 đến 21:30 (ca muộn nhất bắt đầu lúc 21:00)!");
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

    // =========================================================================
    // --- QUẢN LÝ LỊCH RẢNH TRỢ GIẢNG THEO TUẦN (TA AVAILABILITY) ---
    // =========================================================================

    /**
     * Lấy danh sách lịch rảnh theo tuần (từ Thứ 2 đến Chủ Nhật)
     */
    public List<TaAvailability> getWeeklySchedule(LocalDate weekStart, String taId) {
        LocalDate weekEnd = weekStart.plusDays(6);
        if (taId != null && !taId.trim().isEmpty() && !"ALL".equalsIgnoreCase(taId.trim())) {
            return taAvailabilityRepository.findByAvailableDateBetweenAndTaIdOrderByAvailableDateAscStartTimeAsc(weekStart, weekEnd, taId.trim());
        }
        return taAvailabilityRepository.findByAvailableDateBetweenOrderByAvailableDateAscStartTimeAsc(weekStart, weekEnd);
    }

    /**
     * Lưu hoặc cập nhật hàng loạt slot rảnh trong tuần của Trợ giảng
     */
    @Transactional
    public List<TaAvailability> saveWeeklySchedule(BatchTaAvailabilityDto dto, User currentUser) {
        String taId = dto.getTaId().trim();
        String taName = dto.getTaName().trim();

        List<TaAvailability> savedSlots = new ArrayList<>();
        if (dto.getSlots() != null) {
            for (TaSlotRequestDto s : dto.getSlots()) {
                TaAvailability slot;
                if (s.getId() != null) {
                    slot = taAvailabilityRepository.findById(s.getId()).orElse(new TaAvailability());
                } else {
                    slot = new TaAvailability();
                }
                slot.setTaId(taId);
                slot.setTaName(taName);
                slot.setAvailableDate(s.getAvailableDate());
                slot.setDayOfWeek(s.getAvailableDate().getDayOfWeek().getValue());
                slot.setStartTime(s.getStartTime().trim());
                slot.setEndTime(s.getEndTime().trim());
                slot.setSkill(s.getSkill() != null && !s.getSkill().isBlank() ? s.getSkill().trim() : "ALL");
                slot.setMaxCapacity(s.getMaxCapacity() != null && s.getMaxCapacity() > 0 ? s.getMaxCapacity() : 1);
                slot.setStatus(s.getStatus() != null && !s.getStatus().isBlank() ? s.getStatus().trim() : "OPEN");
                slot.setNote(s.getNote());
                if (currentUser != null) {
                    slot.setCreatedBy(currentUser.getId());
                }
                savedSlots.add(taAvailabilityRepository.save(slot));
            }
        }
        return savedSlots;
    }

    /**
     * Sao chép toàn bộ lịch rảnh của Trợ giảng từ tuần nguồn sang tuần đích
     */
    @Transactional
    public List<TaAvailability> copyWeeklySchedule(CopyWeekAvailabilityDto dto, User currentUser) {
        LocalDate fromStart = dto.getFromWeekStartDate();
        LocalDate fromEnd = fromStart.plusDays(6);
        LocalDate toStart = dto.getToWeekStartDate();
        String taId = dto.getTaId().trim();

        List<TaAvailability> sourceSlots = taAvailabilityRepository.findByAvailableDateBetweenAndTaIdOrderByAvailableDateAscStartTimeAsc(fromStart, fromEnd, taId);
        List<TaAvailability> newSlots = new ArrayList<>();

        for (TaAvailability src : sourceSlots) {
            long daysOffset = java.time.temporal.ChronoUnit.DAYS.between(fromStart, src.getAvailableDate());
            LocalDate targetDate = toStart.plusDays(daysOffset);

            List<TaAvailability> existing = taAvailabilityRepository.findOverlappingSlots(taId, targetDate, src.getStartTime(), src.getEndTime());
            if (existing.isEmpty()) {
                TaAvailability copy = TaAvailability.builder()
                        .taId(src.getTaId())
                        .taName(dto.getTaName() != null && !dto.getTaName().isBlank() ? dto.getTaName() : src.getTaName())
                        .availableDate(targetDate)
                        .dayOfWeek(targetDate.getDayOfWeek().getValue())
                        .startTime(src.getStartTime())
                        .endTime(src.getEndTime())
                        .skill(src.getSkill())
                        .maxCapacity(src.getMaxCapacity())
                        .status("OPEN")
                        .note(src.getNote())
                        .createdBy(currentUser != null ? currentUser.getId() : null)
                        .build();
                newSlots.add(taAvailabilityRepository.save(copy));
            }
        }
        return newSlots;
    }

    /**
     * Xóa 1 slot rảnh (chỉ cho xóa nếu chưa có học viên nào đặt)
     */
    @Transactional
    public void deleteAvailabilitySlot(Long slotId, User currentUser) {
        TaAvailability slot = taAvailabilityRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca rảnh!"));

        List<SupportBooking> bookings = bookingRepository.findByBookingDateAndStatusNot(slot.getAvailableDate(), "CANCELLED");
        boolean hasActiveBooking = bookings.stream().anyMatch(b ->
                (b.getAvailabilityId() != null && Objects.equals(b.getAvailabilityId(), slotId)) ||
                (checkTimeOverlap(slot.getStartTime(), slot.getEndTime(), b.getStartTime(), b.getEndTime()) &&
                 Objects.equals(b.getAssignedTaId(), slot.getTaId()))
        );

        if (hasActiveBooking) {
            throw new RuntimeException("Ca rảnh này đã có học viên đặt chỗ! Vui lòng hủy ca của học viên trước khi xóa slot rảnh.");
        }

        taAvailabilityRepository.delete(slot);
    }

    /**
     * Khởi tạo lịch chuẩn cho Trợ giảng Khanh cho tuần chỉ định
     * - T2, T4, T6, T7: 17:30 - 21:30 (8 ca 30p, ca cuối 21:00 - 21:30)
     * - CN: 17:00 - 19:30 (5 ca 30p, ca cuối 19:00 - 19:30)
     * - T3, T5: OFF
     */
    @Transactional
    public List<TaAvailability> seedKhanhWeeklySchedule(LocalDate weekStartDate, User currentUser) {
        if (weekStartDate == null) {
            weekStartDate = LocalDate.now().with(java.time.temporal.TemporalAdjusters.nextOrSame(java.time.DayOfWeek.MONDAY));
        }
        String taId = "khanh";
        String taName = "Trợ giảng Khanh";

        String[] weekdaySlots = {
            "17:30-18:00", "18:00-18:30", "18:30-19:00", "19:00-19:30",
            "19:30-20:00", "20:00-20:30", "20:30-21:00", "21:00-21:30"
        };
        String[] sundaySlots = {
            "17:00-17:30", "17:30-18:00", "18:00-18:30", "18:30-19:00", "19:00-19:30"
        };

        List<TaSlotRequestDto> slotList = new ArrayList<>();
        // T2 (Mon): offset 0
        for (String s : weekdaySlots) {
            String[] parts = s.split("-");
            slotList.add(TaSlotRequestDto.builder()
                    .availableDate(weekStartDate.plusDays(0))
                    .startTime(parts[0])
                    .endTime(parts[1])
                    .skill("ALL")
                    .maxCapacity(1)
                    .note("Ca trực Trợ giảng Khanh")
                    .build());
        }
        // T4 (Wed): offset 2
        for (String s : weekdaySlots) {
            String[] parts = s.split("-");
            slotList.add(TaSlotRequestDto.builder()
                    .availableDate(weekStartDate.plusDays(2))
                    .startTime(parts[0])
                    .endTime(parts[1])
                    .skill("ALL")
                    .maxCapacity(1)
                    .note("Ca trực Trợ giảng Khanh")
                    .build());
        }
        // T6 (Fri): offset 4
        for (String s : weekdaySlots) {
            String[] parts = s.split("-");
            slotList.add(TaSlotRequestDto.builder()
                    .availableDate(weekStartDate.plusDays(4))
                    .startTime(parts[0])
                    .endTime(parts[1])
                    .skill("ALL")
                    .maxCapacity(1)
                    .note("Ca trực Trợ giảng Khanh")
                    .build());
        }
        // T7 (Sat): offset 5
        for (String s : weekdaySlots) {
            String[] parts = s.split("-");
            slotList.add(TaSlotRequestDto.builder()
                    .availableDate(weekStartDate.plusDays(5))
                    .startTime(parts[0])
                    .endTime(parts[1])
                    .skill("ALL")
                    .maxCapacity(1)
                    .note("Ca trực Trợ giảng Khanh")
                    .build());
        }
        // CN (Sun): offset 6
        for (String s : sundaySlots) {
            String[] parts = s.split("-");
            slotList.add(TaSlotRequestDto.builder()
                    .availableDate(weekStartDate.plusDays(6))
                    .startTime(parts[0])
                    .endTime(parts[1])
                    .skill("ALL")
                    .maxCapacity(1)
                    .note("Ca trực Trợ giảng Khanh")
                    .build());
        }

        BatchTaAvailabilityDto batchDto = BatchTaAvailabilityDto.builder()
                .taId(taId)
                .taName(taName)
                .weekStartDate(weekStartDate)
                .slots(slotList)
                .build();

        return saveWeeklySchedule(batchDto, currentUser);
    }
}
