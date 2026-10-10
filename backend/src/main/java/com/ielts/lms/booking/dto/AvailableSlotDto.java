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
    private String skill; // Kỹ năng nếu slot đã có người đặt (cho ca nhóm)
    private Integer currentRegistered; // Số học viên đã đăng ký
    private Integer maxCapacity; // Sức chứa tối đa (1 cho cá nhân, 5 cho Reading/Listening/Writing)
    private Boolean isGroup; // true nếu là môn nhóm (Reading, Listening, Writing)

    // Backward-compatible constructor for existing tests / callers
    public AvailableSlotDto(String startTime, String endTime, boolean available, boolean bookedByMe, Long bookingId, String assignedTaName) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.available = available;
        this.bookedByMe = bookedByMe;
        this.bookingId = bookingId;
        this.assignedTaName = assignedTaName;
        this.currentRegistered = bookedByMe || !available ? 1 : 0;
        this.maxCapacity = 1;
        this.isGroup = false;
    }
}
