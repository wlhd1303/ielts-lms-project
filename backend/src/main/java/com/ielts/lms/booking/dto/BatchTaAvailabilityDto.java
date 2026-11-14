package com.ielts.lms.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchTaAvailabilityDto {

    @NotBlank(message = "Mã Trợ giảng không được để trống")
    private String taId;

    @NotBlank(message = "Tên Trợ giảng không được để trống")
    private String taName;

    @NotNull(message = "Ngày bắt đầu tuần không được để trống")
    private LocalDate weekStartDate; // Thứ Hai

    @Valid
    private List<TaSlotRequestDto> slots;
}
