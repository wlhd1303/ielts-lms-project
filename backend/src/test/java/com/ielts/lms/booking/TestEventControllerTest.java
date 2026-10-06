package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.controller.TestEventController;
import com.ielts.lms.booking.dto.RegisterEventShiftDto;
import com.ielts.lms.booking.entity.TestEvent;
import com.ielts.lms.booking.entity.TestEventRegistration;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TestEventControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TestEventService eventService;

    @Mock
    private UserService userService;

    @InjectMocks
    private TestEventController testEventController;

    private ObjectMapper objectMapper;
    private User mockStudent;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(testEventController).build();
        objectMapper = new ObjectMapper();

        mockStudent = new User();
        mockStudent.setId(50L);
        mockStudent.setUsername("student50");
    }

    @Test
    @DisplayName("TC-EVT-API-01: GET /api/booking/events/open trả về danh sách đợt thi đang mở")
    void testGetOpenEvents() throws Exception {
        TestEvent event = new TestEvent();
        event.setId(1L);
        event.setTitle("Mock Test Tháng 10");
        event.setStatus("OPEN");

        when(eventService.getOpenEvents()).thenReturn(List.of(event));

        mockMvc.perform(get("/api/booking/events/open"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Mock Test Tháng 10"));
    }

    @Test
    @DisplayName("TC-EVT-API-02: POST /api/booking/events/register đăng ký ca thi thành công")
    void testRegisterShift() throws Exception {
        RegisterEventShiftDto dto = new RegisterEventShiftDto();
        dto.setShiftId(10L);
        dto.setFullName("Nguyen Van Student");
        dto.setPhone("0912345678");

        TestEventRegistration reg = new TestEventRegistration();
        reg.setId(100L);
        reg.setFullName(dto.getFullName());
        reg.setStatus("REGISTERED");

        when(userService.getMyProfile()).thenReturn(mockStudent);
        when(eventService.registerShift(any(RegisterEventShiftDto.class), any(User.class))).thenReturn(reg);

        mockMvc.perform(post("/api/booking/events/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("REGISTERED"));
    }

    @Test
    @DisplayName("TC-EVT-API-03: GET /api/booking/events/my-registrations trả về lịch sử thi của học viên")
    void testGetMyRegistrations() throws Exception {
        TestEventRegistration reg = new TestEventRegistration();
        reg.setId(100L);
        reg.setStatus("REGISTERED");

        when(userService.getMyProfile()).thenReturn(mockStudent);
        when(eventService.getMyRegistrations(mockStudent)).thenReturn(List.of(reg));

        mockMvc.perform(get("/api/booking/events/my-registrations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100));
    }

    @Test
    @DisplayName("TC-EVT-API-04: DELETE /api/booking/events/registrations/{id}/cancel hủy đăng ký thành công")
    void testCancelRegistration() throws Exception {
        when(userService.getMyProfile()).thenReturn(mockStudent);

        mockMvc.perform(delete("/api/booking/events/registrations/100/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đã hủy đăng ký ca thi thành công!"));

        verify(eventService).cancelRegistration(100L, mockStudent);
    }
}
