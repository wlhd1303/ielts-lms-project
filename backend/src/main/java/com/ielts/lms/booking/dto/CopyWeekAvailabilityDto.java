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
public class CopyWeekAvailabilityDto {

    @NotBlank(message = "Mã Trợ giảng không được để trống")
    private String taId;

    private String taName;

    @NotNull(message = "Ngày bắt đầu tuần nguồn không được để trống")
    private LocalDate fromWeekStartDate;

    @NotNull(message = "Ngày bắt đầu tuần đích không được để trống")
    private LocalDate toWeekStartDate;
}
