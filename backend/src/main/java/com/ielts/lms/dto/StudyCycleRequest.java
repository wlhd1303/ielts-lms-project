package com.ielts.lms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class StudyCycleRequest {
    private Integer cycleOrder;
    private String cycleType; // "READING" hoặc "LISTENING"
    private String title;
    private Long mockTestId;
    private Long vocabTopicId;
    private Long dictationAudioId;
    private Long speakingTopicId;
    private Long writingTopicId;
    private Boolean isActive;
}
