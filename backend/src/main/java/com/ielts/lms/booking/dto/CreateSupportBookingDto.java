package com.ielts.lms.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateSupportBookingDto {

    @NotNull(message = "Ngày đặt ca không được để trống")
    private LocalDate bookingDate;

    @NotBlank(message = "Giờ bắt đầu không được để trống")
    private String startTime; // "HH:mm"

    private String endTime; // Nếu để trống, service tự tính +30 phút

    @NotBlank(message = "Kỹ năng cần hỗ trợ không được để trống")
    private String skill; // SPEAKING, LISTENING, WRITING, READING, VOCABULARY, GENERAL

    private String studentNote;

    private String preferredTaId; // Tuỳ chọn nếu học viên chọn TA cụ thể
}
