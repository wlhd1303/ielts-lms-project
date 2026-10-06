package com.ielts.lms.booking.dto;

import lombok.Data;

@Data
public class UpdateShiftScoreDto {
    private String status; // ATTENDED, ABSENT, CANCELLED
    private Double scoreListening;
    private Double scoreReading;
    private Double scoreWriting;
    private Double scoreSpeaking;
    private Double overallScore;
    private String feedback;
}
