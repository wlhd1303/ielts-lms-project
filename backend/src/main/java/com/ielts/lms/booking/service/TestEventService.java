package com.ielts.lms.booking.service;

import com.ielts.lms.booking.dto.CreateTestEventDto;
import com.ielts.lms.booking.dto.RegisterEventShiftDto;
import com.ielts.lms.booking.dto.UpdateShiftScoreDto;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.entity.TestEventShift;
import com.ielts.lms.booking.repository.TestEventRegistrationRepository;
import com.ielts.lms.booking.repository.TestEventRepository;
import com.ielts.lms.booking.repository.TestEventShiftRepository;
import com.ielts.lms.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestEventService {

    private final TestEventRepository eventRepository;
    private final TestEventShiftRepository shiftRepository;
    private final TestEventRegistrationRepository registrationRepository;

    /**
     * Lấy danh sách sự kiện thi đang mở đăng ký cho học viên
     */
    public List<TestEvent> getOpenEvents() {
        return eventRepository.findByStatusOrderByEventDateAsc("OPEN");
    }

    /**
     * Lấy toàn bộ sự kiện cho Admin
     */
    public List<TestEvent> getAllEventsAdmin() {
        return eventRepository.findAllByOrderByEventDateDesc();
    }

    /**
     * Admin tạo sự kiện thi mới và chia ca
     */
    @Transactional
    public TestEvent createEvent(CreateTestEventDto dto, User currentUser) {
        TestEvent event = new TestEvent();
        event.setTitle(dto.getTitle().trim());
        event.setDescription(dto.getDescription());
        event.setEventDate(dto.getEventDate());
        event.setLocation(dto.getLocation().trim());
        event.setRegistrationDeadline(dto.getRegistrationDeadline());
        event.setStatus("OPEN");

        List<TestEventShift> shifts = new ArrayList<>();
        if (dto.getShifts() != null) {
            for (CreateTestEventDto.ShiftDto sDto : dto.getShifts()) {
                TestEventShift shift = new TestEventShift();
                shift.setTestEvent(event);
                shift.setShiftName(sDto.getShiftName().trim());
                shift.setStartTime(sDto.getStartTime().trim());
                shift.setEndTime(sDto.getEndTime().trim());
                shift.setMaxCapacity(sDto.getMaxCapacity());
                shift.setCurrentRegistered(0);
                shifts.add(shift);
            }
        }
        event.setShifts(shifts);

        return eventRepository.save(event);
    }

    /**
     * Admin cập nhật thông tin sự kiện thi và các ca thi
     */
    @Transactional
    public TestEvent updateEvent(Long eventId, CreateTestEventDto dto) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi thử có ID " + eventId));

        event.setTitle(dto.getTitle().trim());
        event.setDescription(dto.getDescription());
        event.setEventDate(dto.getEventDate());
        event.setLocation(dto.getLocation().trim());
        event.setRegistrationDeadline(dto.getRegistrationDeadline());
        if (dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
            event.setStatus(dto.getStatus().trim());
        }

        if (dto.getShifts() != null) {
            List<TestEventShift> currentShifts = event.getShifts();
            if (currentShifts == null) {
                currentShifts = new ArrayList<>();
                event.setShifts(currentShifts);
            }

            List<TestEventShift> updatedShifts = new ArrayList<>();
            for (CreateTestEventDto.ShiftDto sDto : dto.getShifts()) {
                TestEventShift shiftToUse = null;
                if (sDto.getId() != null) {
                    for (TestEventShift cur : currentShifts) {
                        if (Objects.equals(cur.getId(), sDto.getId())) {
                            shiftToUse = cur;
                            break;
                        }
                    }
                }
                if (shiftToUse == null) {
                    for (TestEventShift cur : currentShifts) {
                        if (cur.getShiftName().trim().equalsIgnoreCase(sDto.getShiftName().trim())) {
                            shiftToUse = cur;
                            break;
                        }
                    }
                }

                if (shiftToUse == null) {
                    shiftToUse = new TestEventShift();
                    shiftToUse.setTestEvent(event);
                    shiftToUse.setCurrentRegistered(0);
                }

                shiftToUse.setShiftName(sDto.getShiftName().trim());
                shiftToUse.setStartTime(sDto.getStartTime().trim());
                shiftToUse.setEndTime(sDto.getEndTime().trim());
                shiftToUse.setMaxCapacity(sDto.getMaxCapacity());
                updatedShifts.add(shiftToUse);
            }

            // Xóa các đăng ký thuộc các shift đã bị gỡ bỏ
            for (TestEventShift existing : currentShifts) {
                if (!updatedShifts.contains(existing)) {
                    List<TestEventRegistration> regs = registrationRepository.findByShiftId(existing.getId());
                    if (!regs.isEmpty()) {
                        registrationRepository.deleteAll(regs);
                    }
                }
            }

            currentShifts.clear();
            currentShifts.addAll(updatedShifts);
        }

        return eventRepository.save(event);
    }

    /**
     * Admin xóa sự kiện thi và các dữ liệu liên quan
     */
    @Transactional
    public void deleteEvent(Long eventId) {
        TestEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ thi thử có ID " + eventId));

        if (event.getShifts() != null) {
            for (TestEventShift shift : event.getShifts()) {
                List<TestEventRegistration> regs = registrationRepository.findByShiftId(shift.getId());
                if (!regs.isEmpty()) {
                    registrationRepository.deleteAll(regs);
                }
            }
        }
        eventRepository.delete(event);
    }

    /**
     * Học viên đăng ký ca thi với cơ chế khóa số lượng an toàn
     */
    @Transactional
    public synchronized TestEventRegistration registerShift(RegisterEventShiftDto dto, User currentUser) {
        if (currentUser == null) {
            throw new RuntimeException("Bạn cần đăng nhập để đăng ký ca thi!");
        }

        TestEventShift shift = shiftRepository.findById(dto.getShiftId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca thi đã chọn!"));

        TestEvent event = shift.getTestEvent();
        if (event == null || !"OPEN".equals(event.getStatus())) {
            throw new RuntimeException("Sự kiện thi này hiện không mở đăng ký!");
        }

        if (event.getRegistrationDeadline() != null && LocalDateTime.now().isAfter(event.getRegistrationDeadline())) {
            throw new RuntimeException("Đã hết hạn đăng ký cho kỳ thi này!");
        }

        // Kiểm tra xem học viên đã đăng ký ca này trước đó chưa
        boolean alreadyRegistered = registrationRepository.existsByShiftIdAndUserIdAndStatusNot(
                shift.getId(), currentUser.getId(), "CANCELLED"
        );
        if (alreadyRegistered) {
            throw new RuntimeException("Bạn đã đăng ký tham gia ca thi này rồi!");
        }

        // Kiểm tra sĩ số ca thi
        if (shift.getCurrentRegistered() >= shift.getMaxCapacity()) {
            throw new RuntimeException("Ca thi này đã đủ số lượng học viên (" + shift.getMaxCapacity() + " bạn). Vui lòng chọn ca khác!");
        }

        // Tăng sĩ số ca thi
        shift.setCurrentRegistered(shift.getCurrentRegistered() + 1);
        shiftRepository.save(shift);

        TestEventRegistration registration = new TestEventRegistration();
        registration.setShift(shift);
        registration.setUser(currentUser);
        registration.setFullName(dto.getFullName() != null && !dto.getFullName().trim().isEmpty() 
                ? dto.getFullName().trim() : currentUser.getFullName());
        registration.setPhone(dto.getPhone());
        registration.setEmail(dto.getEmail());
        registration.setStatus("REGISTERED");

        return registrationRepository.save(registration);
    }

    /**
     * Học viên hủy đăng ký ca thi trước hạn
     */
    @Transactional
    public synchronized void cancelRegistration(Long registrationId, User currentUser) {
        TestEventRegistration reg = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin đăng ký ca thi!"));

        boolean isAdmin = currentUser != null && ("ROLE_ADMIN".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()));
        boolean isOwner = currentUser != null && reg.getUser() != null && Objects.equals(reg.getUser().getId(), currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Bạn không có quyền hủy đăng ký ca thi này!");
        }

        if ("CANCELLED".equals(reg.getStatus())) {
            return;
        }

        reg.setStatus("CANCELLED");
        registrationRepository.save(reg);

        // Giảm sĩ số ca thi
        TestEventShift shift = reg.getShift();
        if (shift != null && shift.getCurrentRegistered() > 0) {
            shift.setCurrentRegistered(shift.getCurrentRegistered() - 1);
            shiftRepository.save(shift);
        }
    }

    /**
     * Lấy các ca thi mà học viên hiện tại đã đăng ký
     */
    public List<TestEventRegistration> getMyRegistrations(User currentUser) {
        if (currentUser == null) {
            return new ArrayList<>();
        }
        return registrationRepository.findByUserIdOrderByRegisteredAtDesc(currentUser.getId());
    }

    /**
     * Admin xem danh sách thí sinh trong 1 ca thi
     */
    public List<TestEventRegistration> getShiftRegistrations(Long shiftId) {
        return registrationRepository.findByShiftId(shiftId);
    }

    /**
     * Admin / Giảng viên cập nhật điểm thi và nhận xét
     */
    @Transactional
    public TestEventRegistration updateRegistrationScore(Long regId, UpdateShiftScoreDto dto) {
        TestEventRegistration reg = registrationRepository.findById(regId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lượt đăng ký!"));

        if (dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
            reg.setStatus(dto.getStatus().trim());
        } else {
            reg.setStatus("ATTENDED");
        }
        if (dto.getScoreListening() != null) {
            reg.setScoreListening(dto.getScoreListening());
        }
        if (dto.getScoreReading() != null) {
            reg.setScoreReading(dto.getScoreReading());
        }
        if (dto.getScoreWriting() != null) {
            reg.setScoreWriting(dto.getScoreWriting());
        }
        if (dto.getScoreSpeaking() != null) {
            reg.setScoreSpeaking(dto.getScoreSpeaking());
        }
        if (dto.getOverallScore() != null) {
            reg.setOverallScore(dto.getOverallScore());
        }
        if (dto.getFeedback() != null) {
            reg.setFeedback(dto.getFeedback());
        }

        return registrationRepository.save(reg);
    }
}
