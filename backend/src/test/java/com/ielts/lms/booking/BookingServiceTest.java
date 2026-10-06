package com.ielts.lms.booking;

import com.ielts.lms.booking.dto.AvailableSlotDto;
import com.ielts.lms.booking.dto.CreateSupportBookingDto;
import com.ielts.lms.booking.dto.EvaluateBookingDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.repository.SupportBookingRepository;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.booking.service.ExternalDbSyncService;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private SupportBookingRepository bookingRepository;

    @Mock
    private ExternalDbSyncService externalDbSyncService;

    @InjectMocks
    private BookingService bookingService;

    private User testStudent;
    private User testAdmin;

    @BeforeEach
    void setUp() {
        testStudent = new User();
        testStudent.setId(100L);
        testStudent.setUsername("student_test");
        testStudent.setFullName("Nguyen Van A");
        testStudent.setRole("ROLE_USER");

        testAdmin = new User();
        testAdmin.setId(999L);
        testAdmin.setUsername("admin_test");
        testAdmin.setRole("ROLE_ADMIN");
    }

    @Test
    @DisplayName("TC01: Khi chưa có ai đặt, tất cả các slot 30 phút trong ngày đều khả dụng")
    void testGetAvailableSlots_AllAvailable() {
        LocalDate date = LocalDate.now().plusDays(1);
        when(bookingRepository.findByBookingDateAndStatusNot(date, "CANCELLED")).thenReturn(Collections.emptyList());
        when(externalDbSyncService.getBusySlotsForDate(date)).thenReturn(Collections.emptyList());

        List<AvailableSlotDto> slots = bookingService.getAvailableSlots(date, testStudent);

        assertThat(slots).isNotEmpty();
        assertThat(slots).allMatch(AvailableSlotDto::isAvailable);
        assertThat(slots).noneMatch(AvailableSlotDto::isBookedByMe);
    }

    @Test
    @DisplayName("TC02: Slot đã có người đặt phải bị đánh dấu unavailable và slot do chính user đặt phải có bookedByMe = true")
    void testGetAvailableSlots_WithBookings() {
        LocalDate date = LocalDate.now().plusDays(1);

        SupportBooking myBooking = new SupportBooking();
        myBooking.setId(1L);
        myBooking.setUser(testStudent);
        myBooking.setBookingDate(date);
        myBooking.setStartTime("08:30");
        myBooking.setEndTime("09:00");
        myBooking.setStatus("CONFIRMED");

        User otherUser = new User();
        otherUser.setId(200L);

        SupportBooking otherBooking = new SupportBooking();
        otherBooking.setId(2L);
        otherBooking.setUser(otherUser);
        otherBooking.setBookingDate(date);
        otherBooking.setStartTime("09:00");
        otherBooking.setEndTime("09:30");
        otherBooking.setStatus("CONFIRMED");

        when(bookingRepository.findByBookingDateAndStatusNot(date, "CANCELLED"))
                .thenReturn(List.of(myBooking, otherBooking));
        when(externalDbSyncService.getBusySlotsForDate(date)).thenReturn(Collections.emptyList());

        List<AvailableSlotDto> slots = bookingService.getAvailableSlots(date, testStudent);

        // Slot 08:30 - 09:00: Của chính mình
        AvailableSlotDto slot1 = slots.stream().filter(s -> s.getStartTime().equals("08:30")).findFirst().orElseThrow();
        assertThat(slot1.isAvailable()).isFalse();
        assertThat(slot1.isBookedByMe()).isTrue();
        assertThat(slot1.getBookingId()).isEqualTo(1L);

        // Slot 09:00 - 09:30: Người khác đặt
        AvailableSlotDto slot2 = slots.stream().filter(s -> s.getStartTime().equals("09:00")).findFirst().orElseThrow();
        assertThat(slot2.isAvailable()).isFalse();
        assertThat(slot2.isBookedByMe()).isFalse();

        // Slot 09:30 - 10:00: Vẫn còn trống
        AvailableSlotDto slot3 = slots.stream().filter(s -> s.getStartTime().equals("09:30")).findFirst().orElseThrow();
        assertThat(slot3.isAvailable()).isTrue();
    }

    @Test
    @DisplayName("TC03: Đặt lịch hỗ trợ thành công khi khung giờ hợp lệ và còn trống")
    void testBookSupportSession_Success() {
        LocalDate futureDate = LocalDate.now().plusDays(2);
        CreateSupportBookingDto dto = new CreateSupportBookingDto();
        dto.setBookingDate(futureDate);
        dto.setStartTime("14:00");
        dto.setEndTime("14:30");
        dto.setSkill("SPEAKING");
        dto.setStudentNote("Muốn luyện Part 2 chủ đề Hometown");

        when(bookingRepository.findUserOverlappingBookings(testStudent.getId(), futureDate, "14:00", "14:30"))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.findOverlappingBookings(futureDate, "14:00", "14:30"))
                .thenReturn(Collections.emptyList());
        when(externalDbSyncService.getBusySlotsForDate(futureDate)).thenReturn(Collections.emptyList());
        when(bookingRepository.save(any(SupportBooking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupportBooking result = bookingService.bookSupportSession(dto, testStudent);

        assertThat(result).isNotNull();
        assertThat(result.getStartTime()).isEqualTo("14:00");
        assertThat(result.getEndTime()).isEqualTo("14:30");
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        assertThat(result.getSkill()).isEqualTo("SPEAKING");
        assertThat(result.getUser()).isEqualTo(testStudent);
    }

    @Test
    @DisplayName("TC04: Đặt lịch cho ngày trong quá khứ phải ném ra ngoại lệ")
    void testBookSupportSession_PastDate_Throws() {
        CreateSupportBookingDto dto = new CreateSupportBookingDto();
        dto.setBookingDate(LocalDate.now().minusDays(1));
        dto.setStartTime("14:00");
        dto.setSkill("WRITING");

        assertThatThrownBy(() -> bookingService.bookSupportSession(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể đặt lịch cho ngày trong quá khứ");
    }

    @Test
    @DisplayName("TC05: Chống trùng lịch học viên: Học viên đã có ca trùng giờ phải ném ra ngoại lệ")
    void testBookSupportSession_UserConflict_Throws() {
        LocalDate date = LocalDate.now().plusDays(1);
        CreateSupportBookingDto dto = new CreateSupportBookingDto();
        dto.setBookingDate(date);
        dto.setStartTime("15:00");
        dto.setSkill("READING");

        SupportBooking existingBooking = new SupportBooking();
        existingBooking.setId(10L);

        when(bookingRepository.findUserOverlappingBookings(testStudent.getId(), date, "15:00", "15:30"))
                .thenReturn(List.of(existingBooking));

        assertThatThrownBy(() -> bookingService.bookSupportSession(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Bạn đã có một ca hỗ trợ khác trùng vào khung giờ này");
    }

    @Test
    @DisplayName("TC06: Chống trùng slot: Khung giờ đã có người khác đặt trước phải ném ra ngoại lệ")
    void testBookSupportSession_SlotConflict_Throws() {
        LocalDate date = LocalDate.now().plusDays(1);
        CreateSupportBookingDto dto = new CreateSupportBookingDto();
        dto.setBookingDate(date);
        dto.setStartTime("16:00");
        dto.setSkill("LISTENING");

        SupportBooking otherBooking = new SupportBooking();
        otherBooking.setId(20L);

        when(bookingRepository.findUserOverlappingBookings(testStudent.getId(), date, "16:00", "16:30"))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.findOverlappingBookings(date, "16:00", "16:30"))
                .thenReturn(List.of(otherBooking));

        assertThatThrownBy(() -> bookingService.bookSupportSession(dto, testStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Khung giờ này vừa có người đặt trước");
    }

    @Test
    @DisplayName("TC07: Học viên sở hữu ca hỗ trợ có thể hủy ca thành công")
    void testCancelBooking_Success_ByOwner() {
        SupportBooking booking = new SupportBooking();
        booking.setId(55L);
        booking.setUser(testStudent);
        booking.setStatus("CONFIRMED");

        when(bookingRepository.findById(55L)).thenReturn(Optional.of(booking));

        bookingService.cancelBooking(55L, testStudent);

        assertThat(booking.getStatus()).isEqualTo("CANCELLED");
        verify(bookingRepository).save(booking);
    }

    @Test
    @DisplayName("TC08: Học viên khác không được quyền hủy ca của người khác")
    void testCancelBooking_Forbidden_OtherUser() {
        User otherStudent = new User();
        otherStudent.setId(999L);
        otherStudent.setRole("ROLE_USER");

        SupportBooking booking = new SupportBooking();
        booking.setId(55L);
        booking.setUser(testStudent);
        booking.setStatus("CONFIRMED");

        when(bookingRepository.findById(55L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancelBooking(55L, otherStudent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Bạn không có quyền hủy");
    }

    @Test
    @DisplayName("TC09: Trợ giảng đánh giá ca hỗ trợ thành công và đổi trạng thái sang COMPLETED")
    void testEvaluateBooking_Success() {
        SupportBooking booking = new SupportBooking();
        booking.setId(77L);
        booking.setStatus("CONFIRMED");

        when(bookingRepository.findById(77L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(SupportBooking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EvaluateBookingDto dto = new EvaluateBookingDto();
        dto.setIsPresent(true);
        dto.setScore(7.5);
        dto.setTaComment("Học viên phát âm rõ ràng, tiến bộ tốt");
        dto.setAssignedTaName("Trợ Giảng Thảo");

        SupportBooking result = bookingService.evaluateBooking(77L, dto);

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getScore()).isEqualTo(7.5);
        assertThat(result.getTaComment()).isEqualTo("Học viên phát âm rõ ràng, tiến bộ tốt");
        assertThat(result.getAssignedTaName()).isEqualTo("Trợ Giảng Thảo");
        assertThat(result.getEvaluatedAt()).isNotNull();
    }
}
