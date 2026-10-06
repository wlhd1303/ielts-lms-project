package com.ielts.lms.booking.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterEventShiftDto {

    @NotNull(message = "Mã ca thi không được để trống")
    private Long shiftId;

    private String fullName;
    private String phone;
    private String email;
}
