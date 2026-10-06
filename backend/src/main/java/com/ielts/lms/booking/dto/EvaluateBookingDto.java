package com.ielts.lms.booking.dto;

import lombok.Data;

@Data
public class EvaluateBookingDto {
    private Boolean isPresent;
    private String absenceReason;
    private Double score;
    private String taComment;
    private String assignedTaName;
}
