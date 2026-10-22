package com.ielts.lms.booking.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class EventExamConfigDto {

    private String examFormat; // OFFLINE, ONLINE
    private String skillType;  // LISTENING, READING, BOTH
    private Integer durationMinutes;
    private String pdfUrl;
    private String audioUrl;
    private String passageText;
    private Boolean allowReview;
    private List<QuestionConfigDto> questions;

    @Data
    @NoArgsConstructor
    public static class QuestionConfigDto {
        private String skill; // LISTENING or READING
        private Integer questionNumber;
        private String questionText;
        private String correctAnswer;
    }
}
