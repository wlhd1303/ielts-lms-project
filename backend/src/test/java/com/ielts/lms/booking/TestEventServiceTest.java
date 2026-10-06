package com.ielts.lms.booking;

import com.ielts.lms.booking.dto.CreateTestEventDto;
import com.ielts.lms.booking.dto.RegisterEventShiftDto;
import com.ielts.lms.booking.dto.UpdateShiftScoreDto;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventRegistration;
import com.ielts.lms.booking.entity.TestEventShift;
import com.ielts.lms.booking.repository.TestEventRegistrationRepository;
import com.ielts.lms.booking.repository.TestEventRepository;
import com.ielts.lms.booking.repository.TestEventShiftRepository;
import com.ielts.lms.booking.service.TestEventService;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestEventServiceTest {

    @Mock
    private TestEventRepository eventRepository;

    @Mock
    private TestEventShiftRepository shiftRepository;

    @Mock
    private TestEventRegistrationRepository registrationRepository;

    @InjectMocks
    private TestEventService eventService;

    private User testStudent;
    private User testAdmin;
    private TestEvent testEvent;
    private TestEventShift testShift;

    @BeforeEach
    void setUp() {
        testStudent = new User();
        testStudent.setId(101L);
        testStudent.setUsername("student_mock");
        testStudent.setFullName("Tran Van B");
        testStudent.setRole("ROLE_USER");

        testAdmin = new User();
        testAdmin.setId(999L);
        testAdmin.setUsername("admin11");
        testAdmin.setRole("ROLE_ADMIN");

        testEvent = new TestEvent();
        testEvent.setId(1L);
        testEvent.setTitle("IELTS Mock Test Tháng 10");
        testEvent.setEventDate(LocalDate.now().plusDays(5));
        testEvent.setLocation("Phòng Lab 2");
        testEvent.setStatus("OPEN");
        testEvent.setRegistrationDeadline(LocalDateTime.now().plusDays(3));

        testShift = new TestEventShift();
        testShift.setId(10L);
        testShift.setTestEvent(testEvent);
        testShift.setShiftName("Ca Sáng (08:30 - 11:30)");
        testShift.setStartTime("08:30");
        testShift.setEndTime("11:30");
        testShift.setMaxCapacity(20);
        testShift.setCurrentRegistered(15);
    }

    @Test
    @DisplayName("TC10: Tạo sự kiện thi thử mới thành công cùng các ca thi")
    void testCreateEvent_Success() {
        CreateTestEventDto dto = new CreateTestEventDto();
        dto.setTitle("IELTS Speaking Mock Test");
        dto.setDescription("Thi thử 1-1 với giáo viên");
        dto.setEventDate(LocalDate.now().plusDays(7));
        dto.setLocation("Phòng 301");

        CreateTestEventDto.ShiftDto shift1 = new CreateTestEventDto.ShiftDto();
        shift1.setShiftName("Ca 1");
        shift1.setStartTime("09:00");
        shift1.setEndTime("12:00");
        shift1.setMaxCapacity(15);

        dto.setShifts(List.of(shift1));

        when(eventRepository.save(any(TestEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TestEvent created = eventService.createEvent(dto, testAdmin);

        assertThat(created).isNotNull();
        assertThat(created.getTitle()).isEqualTo("IELTS Speaking Mock Test");
        assertThat(created.getStatus()).isEqualTo("OPEN");
        assertThat(created.getShifts()).hasSize(1);
        assertThat(created.getShifts().get(0).getMaxCapacity()).isEqualTo(15);
    }

    @Test
    @DisplayName("TC11: Học viên đăng ký ca thi thành công và sĩ số ca thi tăng lên 1")
    void testRegisterShift_Success() {
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);
        dto.setFullName("Tran Van B");
        dto.setPhone("0988776655");

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.existsByShiftIdAndUserIdAndStatusNot(10L, 101L, "CANCELLED")).thenReturn(false);
        when(registrationRepository.save(any(TestEventRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TestEventRegistration reg = eventService.registerShift(dto, testStudent);

        assertThat(reg).isNotNull();
        assertThat(reg.getStatus()).isEqualTo("REGISTERED");
        assertThat(reg.getFullName()).isEqualTo("Tran Van B");
        assertThat(testShift.getCurrentRegistered()).isEqualTo(16); // 15 + 1
        verify(shiftRepository).save(testShift);
    }

    @Test
    @DisplayName("TC12: Đăng ký thất bại nếu sự kiện không ở trạng thái OPEN")
    void testRegisterShift_EventNotOpen_Throws() {
        testEvent.setStatus("CLOSED");
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));

        assertThatThrownBy(() -> eventService.registerShift(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("hiện không mở đăng ký");
    }

    @Test
    @DisplayName("TC13: Đăng ký thất bại nếu đã quá hạn chót đăng ký (Deadline)")
    void testRegisterShift_DeadlinePassed_Throws() {
        testEvent.setRegistrationDeadline(LocalDateTime.now().minusHours(1));
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));

        assertThatThrownBy(() -> eventService.registerShift(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Đã hết hạn đăng ký");
    }

    @Test
    @DisplayName("TC14: Đăng ký thất bại nếu học viên đã đăng ký ca này trước đó")
    void testRegisterShift_AlreadyRegistered_Throws() {
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.existsByShiftIdAndUserIdAndStatusNot(10L, 101L, "CANCELLED")).thenReturn(true);

        assertThatThrownBy(() -> eventService.registerShift(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Bạn đã đăng ký tham gia ca thi này rồi");
    }

    @Test
    @DisplayName("TC15: Đăng ký thất bại khi ca thi đã đủ sĩ số tối đa (Max Capacity)")
    void testRegisterShift_CapacityExceeded_Throws() {
        testShift.setCurrentRegistered(20); // Đã đầy 20/20
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);

        when(shiftRepository.findById(10L)).thenReturn(Optional.of(testShift));
        when(registrationRepository.existsByShiftIdAndUserIdAndStatusNot(10L, 101L, "CANCELLED")).thenReturn(false);

        assertThatThrownBy(() -> eventService.registerShift(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đã đủ số lượng học viên");
    }

    @Test
    @DisplayName("TC16: Hủy đăng ký ca thi thành công và sĩ số ca thi giảm đi 1")
    void testCancelRegistration_Success() {
        TestEventRegistration reg = new TestEventRegistration();
        reg.setId(500L);
        reg.setShift(testShift);
        reg.setUser(testStudent);
        reg.setStatus("REGISTERED");

        when(registrationRepository.findById(500L)).thenReturn(Optional.of(reg));

        eventService.cancelRegistration(500L, testStudent);

        assertThat(reg.getStatus()).isEqualTo("CANCELLED");
        assertThat(testShift.getCurrentRegistered()).isEqualTo(14); // 15 - 1
        verify(shiftRepository).save(testShift);
        verify(registrationRepository).save(reg);
    }

    @Test
    @DisplayName("TC17: Giảng viên cập nhật điểm 4 kỹ năng và overall band score thành công")
    void testUpdateRegistrationScore_Success() {
        TestEventRegistration reg = new TestEventRegistration();
        reg.setId(500L);
        reg.setStatus("REGISTERED");

        when(registrationRepository.findById(500L)).thenReturn(Optional.of(reg));
        when(registrationRepository.save(any(TestEventRegistration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateShiftScoreDto scoreDto = new UpdateShiftScoreDto();
        scoreDto.setScoreListening(7.5);
        scoreDto.setScoreReading(8.0);
        scoreDto.setScoreWriting(6.5);
        scoreDto.setScoreSpeaking(7.0);
        scoreDto.setOverallScore(7.5);
        scoreDto.setFeedback("Bài làm rất tốt, cần lưu ý căn thời gian Writing Task 2");

        TestEventRegistration updated = eventService.updateRegistrationScore(500L, scoreDto);

        assertThat(updated.getStatus()).isEqualTo("ATTENDED");
        assertThat(updated.getScoreListening()).isEqualTo(7.5);
        assertThat(updated.getScoreReading()).isEqualTo(8.0);
        assertThat(updated.getScoreWriting()).isEqualTo(6.5);
        assertThat(updated.getScoreSpeaking()).isEqualTo(7.0);
        assertThat(updated.getOverallScore()).isEqualTo(7.5);
        assertThat(updated.getFeedback()).contains("Writing Task 2");
    }
}
