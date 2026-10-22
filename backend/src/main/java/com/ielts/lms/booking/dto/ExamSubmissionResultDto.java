package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSubmissionResultDto {

    private Long registrationId;
    private Long eventId;
    private Long shiftId;
    private String studentName;
    private String eventTitle;
    private String shiftName;
    private String skillType;

    private Integer listeningCorrectCount;
    private Integer readingCorrectCount;
    private Double scoreListening;
    private Double scoreReading;
    private Double overallScore;

    private LocalDateTime submittedAt;
    private String feedback;
    private Boolean allowReview;

    // Chi tiết câu hỏi nếu allowReview = true
    private List<QuestionReviewDetailDto> reviewDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionReviewDetailDto {
        private String skill;
        private Integer questionNumber;
        private String questionText;
        private String studentAnswer;
        private String correctAnswer;
        private boolean isCorrect;
    }
}
