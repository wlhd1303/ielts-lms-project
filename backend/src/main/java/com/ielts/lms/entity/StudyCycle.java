package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "study_cycles")
@Data
@NoArgsConstructor
public class StudyCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private StudentClass studentClass;

    @Column(name = "cycle_order", nullable = false)
    private int cycleOrder; // Thứ tự vòng: 1, 2, 3...

    @Column(name = "cycle_type", nullable = false, length = 20)
    private String cycleType; // READING hoặc LISTENING

    @Column(nullable = false)
    private String title; // Ví dụ: "Vòng 1: Cam 18 Test 1 (Reading)"

    // Đề Mock Test cuối vòng (bắt buộc)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mock_test_id")
    private MockTest mockTest;

    // Chủ đề từ vựng chuẩn bị (Vocab Topic)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vocab_topic_id")
    private VocabTopic vocabTopic;

    // Bài nghe chép chính tả (Dictation Audio) - chỉ dùng cho LISTENING, null nếu là READING
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "dictation_audio_id")
    private DictationAudio dictationAudio;

    // Bài luyện nói (Speaking Topic)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "speaking_topic_id")
    private SpeakingTopic speakingTopic;

    // Bài luyện viết (Writing Topic)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "writing_topic_id")
    private WritingTopic writingTopic;

    @Column(name = "is_active")
    private boolean isActive = true;
}
