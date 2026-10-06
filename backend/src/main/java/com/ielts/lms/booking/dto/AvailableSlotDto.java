package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailableSlotDto {
    private String startTime; // "HH:mm" e.g. "09:00"
    private String endTime;   // "HH:mm" e.g. "09:30"
    private boolean available; // true = còn trống, false = đã kín
    private boolean bookedByMe; // true nếu chính user đang đăng nhập đã book slot này
    private Long bookingId;    // ID của booking nếu do user book
    private String assignedTaName; // Tên TA nếu có
}
