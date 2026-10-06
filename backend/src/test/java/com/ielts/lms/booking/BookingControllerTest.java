package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.controller.BookingController;
import com.ielts.lms.booking.dto.AvailableSlotDto;
import com.ielts.lms.booking.dto.CreateSupportBookingDto;
import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.booking.service.ExternalDbSyncService;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BookingControllerTest {

    private MockMvc mockMvc;

    @Mock
    private BookingService bookingService;

    @Mock
    private UserService userService;

    @Mock
    private ExternalDbSyncService externalDbSyncService;

    @InjectMocks
    private BookingController bookingController;

    private ObjectMapper objectMapper;
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(bookingController).build();

        mockUser = new User();
        mockUser.setId(10L);
        mockUser.setUsername("test_student");
        mockUser.setFullName("Nguyen Van Test");
    }

    @Test
    @DisplayName("TC-API-01: GET /api/booking/support/slots trả về 200 và danh sách slot")
    void testGetAvailableSlots_Success() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 15);
        AvailableSlotDto slot = new AvailableSlotDto("09:00", "09:30", true, false, null, null);

        when(userService.getMyProfile()).thenReturn(mockUser);
        when(bookingService.getAvailableSlots(eq(date), any(User.class))).thenReturn(List.of(slot));

        mockMvc.perform(get("/api/booking/support/slots")
                        .param("date", "2026-10-15")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].startTime").value("09:00"))
                .andExpect(jsonPath("$[0].available").value(true));
    }

    @Test
    @DisplayName("TC-API-02: POST /api/booking/support/book đặt lịch hợp lệ trả về 200")
    void testBookSupportSession_Success() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(2);
        String jsonPayload = """
            {
                "bookingDate": "%s",
                "startTime": "10:00",
                "endTime": "10:30",
                "skill": "SPEAKING",
                "studentNote": "Luyện phát âm"
            }
            """.formatted(futureDate);

        SupportBooking booking = new SupportBooking();
        booking.setId(101L);
        booking.setBookingDate(futureDate);
        booking.setStartTime("10:00");
        booking.setEndTime("10:30");
        booking.setStatus("CONFIRMED");

        when(userService.getMyProfile()).thenReturn(mockUser);
        when(bookingService.bookSupportSession(any(CreateSupportBookingDto.class), any(User.class))).thenReturn(booking);

        mockMvc.perform(post("/api/booking/support/book")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("TC-API-03: GET /api/booking/support/my-bookings trả về danh sách lịch đã đặt")
    void testGetMyBookings_Success() throws Exception {
        SupportBooking booking = new SupportBooking();
        booking.setId(202L);
        booking.setStartTime("14:00");
        booking.setEndTime("14:30");
        booking.setStatus("CONFIRMED");

        when(userService.getMyProfile()).thenReturn(mockUser);
        when(bookingService.getMyBookings(mockUser)).thenReturn(List.of(booking));

        mockMvc.perform(get("/api/booking/support/my-bookings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(202))
                .andExpect(jsonPath("$[0].startTime").value("14:00"));
    }

    @Test
    @DisplayName("TC-API-04: DELETE /api/booking/support/{id}/cancel hủy lịch thành công trả về 200")
    void testCancelBooking_Success() throws Exception {
        when(userService.getMyProfile()).thenReturn(mockUser);

        mockMvc.perform(delete("/api/booking/support/202/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đã hủy ca hỗ trợ thành công!"));

        verify(bookingService).cancelBooking(202L, mockUser);
    }

    @Test
    @DisplayName("TC-API-05: GET /api/booking/support/teaching-assistants trả về danh sách trợ giảng")
    void testGetTeachingAssistants_Success() throws Exception {
        ExternalDbSyncService.ExternalTaDto ta = new ExternalDbSyncService.ExternalTaDto();
        ta.setId("ta-uuid-1");
        ta.setFullName("Nguyen Van TA");

        when(externalDbSyncService.getTeachingAssistants()).thenReturn(List.of(ta));

        mockMvc.perform(get("/api/booking/support/teaching-assistants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("ta-uuid-1"))
                .andExpect(jsonPath("$[0].fullName").value("Nguyen Van TA"));
    }
}
