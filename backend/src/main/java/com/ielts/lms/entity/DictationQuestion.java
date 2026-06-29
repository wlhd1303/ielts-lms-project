package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dictation_questions")
@Data
@NoArgsConstructor
public class DictationQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "start_time", nullable = false)
    private Integer startTime; // Giây bắt đầu (Ví dụ: 15)

    @Column(name = "end_time", nullable = false)
    private Integer endTime; // Giây kết thúc (Ví dụ: 30)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String transcript; // Đáp án văn bản chính tả

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_id", nullable = false)
    private DictationAudio audio;
}