package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartExamResponseDto {

    private Long registrationId;
    private Long eventId;
    private Long shiftId;
    private String eventTitle;
    private String shiftName;
    private String skillType; // LISTENING, READING, BOTH
    private Integer durationMinutes;
    private LocalDateTime startedAt;
    private LocalDateTime deadline;
    private Long remainingSeconds;

    private String pdfUrl;
    private String audioUrl;
    private String passageText;

    private List<StudentQuestionDto> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentQuestionDto {
        private String skill; // LISTENING or READING
        private Integer questionNumber;
        private String questionText;
    }
}
