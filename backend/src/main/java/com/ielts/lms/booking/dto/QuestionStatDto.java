package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionStatDto {
    private Integer questionNumber;
    private String skill;
    private Integer wrongCount;
    private Integer totalAttempts;
    private Double wrongRate;
}
