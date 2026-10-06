package com.ielts.lms.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateTestEventDto {

    @NotBlank(message = "Tiêu đề sự kiện không được để trống")
    private String title;

    private String description;

    @NotNull(message = "Ngày diễn ra sự kiện không được để trống")
    private LocalDate eventDate;

    @NotBlank(message = "Địa điểm không được để trống")
    private String location;

    private LocalDateTime registrationDeadline;

    @NotEmpty(message = "Phải có ít nhất 1 ca thi")
    private List<ShiftDto> shifts;

    @Data
    public static class ShiftDto {
        @NotBlank(message = "Tên ca thi không được để trống")
        private String shiftName;

        @NotBlank(message = "Giờ bắt đầu không được để trống")
        private String startTime;

        @NotBlank(message = "Giờ kết thúc không được để trống")
        private String endTime;

        @NotNull(message = "Sĩ số tối đa không được để trống")
        private Integer maxCapacity;
    }
}
