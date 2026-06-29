package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;

@Entity
@Table(name = "dictation_audios")
@Data
@NoArgsConstructor
public class DictationAudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audio_url", nullable = false)
    private String audioUrl; // Link file âm thanh tổng (Ví dụ: lưu trên Cloudinary)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", nullable = false)
    private DictationTopic topic;

    // Một bài nghe lớn sẽ bị cắt thành 20-30 câu hỏi nhỏ
    @OneToMany(mappedBy = "audio", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @ToString.Exclude
    private List<DictationQuestion> questions;
}