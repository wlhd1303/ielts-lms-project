package com.ielts.lms.booking;

import com.ielts.lms.booking.controller.AdminBookingController;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminBookingControllerTest {

    private MockMvc mockMvc;

    @Mock
    private BookingService bookingService;

    @Mock
    private TestEventService eventService;

    @Mock
    private UserService userService;

    @InjectMocks
    private AdminBookingController adminBookingController;

    private User adminUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminBookingController).build();

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setUsername("admin");
        adminUser.setRole("ROLE_ADMIN");
    }

    @Test
    @DisplayName("TC-ADMIN-01: GET /api/admin/booking/support lấy danh sách toàn bộ ca hỗ trợ")
    void testGetAllSupportBookings() throws Exception {
        SupportBooking booking = new SupportBooking();
        booking.setId(10L);
        booking.setStatus("CONFIRMED");

        when(bookingService.getAllBookingsAdmin()).thenReturn(List.of(booking));

        mockMvc.perform(get("/api/admin/booking/support"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("TC-ADMIN-02: PUT /api/admin/booking/support/{id}/evaluate đánh giá ca hỗ trợ")
    void testEvaluateSupportBooking() throws Exception {
        String jsonPayload = """
            {
                "isPresent": true,
                "score": 8.0,
                "taComment": "Tốt"
            }
            """;

        SupportBooking evaluated = new SupportBooking();
        evaluated.setId(10L);
        evaluated.setStatus("COMPLETED");
        evaluated.setScore(8.0);

        when(bookingService.evaluateBooking(eq(10L), any(EvaluateBookingDto.class))).thenReturn(evaluated);

        mockMvc.perform(put("/api/admin/booking/support/10/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.score").value(8.0));
    }

    @Test
    @DisplayName("TC-ADMIN-03: POST /api/admin/booking/events tạo đợt thi thử mới")
    void testCreateEvent() throws Exception {
        LocalDate eventDate = LocalDate.now().plusDays(10);
        String jsonPayload = """
            {
                "title": "Mock Test Q4",
                "eventDate": "%s",
                "location": "Phòng 201",
                "shifts": [
                    {
                        "shiftName": "Ca Sáng",
                        "startTime": "08:00",
                        "endTime": "11:00",
                        "maxCapacity": 30
                    }
                ]
            }
            """.formatted(eventDate);

        TestEvent event = new TestEvent();
        event.setId(99L);
        event.setTitle("Mock Test Q4");

        when(userService.getMyProfile()).thenReturn(adminUser);
        when(eventService.createEvent(any(CreateTestEventDto.class), any(User.class))).thenReturn(event);

        mockMvc.perform(post("/api/admin/booking/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.title").value("Mock Test Q4"));
    }

    @Test
    @DisplayName("TC-ADMIN-04: PUT /api/admin/booking/events/{id} cập nhật đợt thi thử")
    void testUpdateEvent() throws Exception {
        LocalDate eventDate = LocalDate.now().plusDays(12);
        String jsonPayload = """
            {
                "title": "Mock Test Q4 Updated",
                "eventDate": "%s",
                "location": "Phòng 301",
                "shifts": [
                    {
                        "id": 1,
                        "shiftName": "Ca Sáng",
                        "startTime": "08:30",
                        "endTime": "11:30",
                        "maxCapacity": 25
                    }
                ]
            }
            """.formatted(eventDate);

        TestEvent updated = new TestEvent();
        updated.setId(99L);
        updated.setTitle("Mock Test Q4 Updated");

        when(eventService.updateEvent(eq(99L), any(CreateTestEventDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/admin/booking/events/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.title").value("Mock Test Q4 Updated"));
    }

    @Test
    @DisplayName("TC-ADMIN-05: DELETE /api/admin/booking/events/{id} xóa đợt thi thử")
    void testDeleteEvent() throws Exception {
        doNothing().when(eventService).deleteEvent(99L);

        mockMvc.perform(delete("/api/admin/booking/events/99"))
                .andExpect(status().isOk());

        verify(eventService).deleteEvent(99L);
    }

    @Test
    @DisplayName("TC-ADMIN-06: GET /api/admin/booking/events/shifts/{shiftId}/students lấy học viên theo ca")
    void testGetShiftStudents() throws Exception {
        TestEventRegistration reg = new TestEventRegistration();
        reg.setId(5L);
        reg.setFullName("Nguyen Van Hoc");

        when(eventService.getShiftRegistrations(15L)).thenReturn(List.of(reg));

        mockMvc.perform(get("/api/admin/booking/events/shifts/15/students"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(5))
                .andExpect(jsonPath("$[0].fullName").value("Nguyen Van Hoc"));
    }

    @Test
    @DisplayName("TC-ADMIN-07: PUT /api/admin/booking/events/registrations/{regId}/score chấm điểm học viên")
    void testUpdateStudentScore() throws Exception {
        String jsonPayload = """
            {
                "listeningScore": 7.5,
                "readingScore": 8.0,
                "overallScore": 7.5
            }
            """;

        TestEventRegistration updated = new TestEventRegistration();
        updated.setId(5L);
        updated.setScoreListening(7.5);
        updated.setScoreReading(8.0);
        updated.setOverallScore(7.5);
        updated.setStatus("COMPLETED");

        when(eventService.updateRegistrationScore(eq(5L), any(UpdateShiftScoreDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/admin/booking/events/registrations/5/score")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.overallScore").value(7.5))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }
}
