package com.ielts.lms.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaSlotRequestDto {
    private Long id; // null nếu là tạo mới, có id nếu cập nhật

    @NotNull(message = "Ngày không được để trống")
    private LocalDate availableDate;

    @NotBlank(message = "Giờ bắt đầu không được để trống")
    private String startTime; // "17:30"

    @NotBlank(message = "Giờ kết thúc không được để trống")
    private String endTime;   // "18:00"

    private String skill;     // "ALL", "SPEAKING", ...

    private Integer maxCapacity; // 1 hoặc 5

    private String note;

    private String status;    // "OPEN", "CANCELLED"
}
