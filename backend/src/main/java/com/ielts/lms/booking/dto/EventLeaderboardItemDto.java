package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLeaderboardItemDto {
    private Integer rank;
    private Long registrationId;
    private Long userId;
    private String fullName;
    private String username;
    private String avatarUrl;
    private Long shiftId;
    private String shiftName;
    private Double scoreListening;
    private Double scoreReading;
    private Double scoreWriting;
    private Double scoreSpeaking;
    private Double overallScore;
    private Integer correctCount;
    private Integer totalQuestions;
    private Integer durationMinutes;
    private Timestamp submittedAt;
    private String phone;
    private String email;
    private Boolean isCurrentUser;
}
