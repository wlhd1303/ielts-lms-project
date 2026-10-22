package com.ielts.lms.booking.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
public class SubmitEventExamDto {

    // Map of answers:
    // Key can be questionNumber (e.g. "1", "2") for single skill,
    // or composite like "LISTENING_1", "READING_1" for BOTH skills.
    private Map<String, String> answers;
}
