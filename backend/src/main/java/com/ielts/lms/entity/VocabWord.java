package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vocab_words")
@Data
@NoArgsConstructor
public class VocabWord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "english_word", nullable = false)
    private String englishWord;

    @Column(name = "vietnamese_meaning", nullable = false)
    private String vietnameseMeaning; // Đáp án đúng

    @Column(name = "wrong_option_1")
    private String wrongOption1;

    @Column(name = "wrong_option_2")
    private String wrongOption2;

    @Column(name = "wrong_option_3")
    private String wrongOption3;

    @Column(name = "audio_url")
    private String audioUrl; // Link file AI đọc TTS

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", nullable = false)
    private VocabTopic topic;
}