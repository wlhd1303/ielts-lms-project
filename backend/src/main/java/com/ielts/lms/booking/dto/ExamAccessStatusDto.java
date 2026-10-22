package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamAccessStatusDto {

    private String status; // EARLY, OPEN_WINDOW, IN_PROGRESS, SUBMITTED, MISSED_WINDOW, NOT_REGISTERED
    private Long registrationId;
    private Long eventId;
    private Long shiftId;
    private String eventTitle;
    private String shiftName;
    private String examFormat; // OFFLINE, ONLINE
    private String skillType;  // LISTENING, READING, BOTH
    private Integer durationMinutes;
    private LocalDateTime serverTime;
    private LocalDateTime windowStart; // shift.startTime on eventDate
    private LocalDateTime windowEnd;   // windowStart + 1 hour
    private LocalDateTime examStartedAt;
    private LocalDateTime personalDeadline; // examStartedAt + durationMinutes
    private Long secondsUntilWindow;
    private Long secondsRemainingInExam;
    private Boolean allowReview;
}
