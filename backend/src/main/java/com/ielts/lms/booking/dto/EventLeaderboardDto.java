package com.ielts.lms.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLeaderboardDto {
    private Long eventId;
    private String eventTitle;
    private String skillType; // READING, LISTENING, BOTH
    private Boolean isPublic;
    private Integer totalParticipants;
    private Double averageScore;
    private Double highestScore;
    
    @Builder.Default
    private List<QuestionStatDto> topHardestQuestions = new ArrayList<>();
    
    private EventLeaderboardItemDto myRank;
    
    @Builder.Default
    private List<EventLeaderboardItemDto> topThree = new ArrayList<>();
    
    @Builder.Default
    private List<EventLeaderboardItemDto> rankings = new ArrayList<>();
}
