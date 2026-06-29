package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "writing_prompts")
@Data
@NoArgsConstructor
public class WritingPrompt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vietnamese_sentence", columnDefinition = "TEXT", nullable = false)
    private String vietnameseSentence;

    @Column(nullable = false)
    private String keywords; 

    @Column(name = "english_answer", columnDefinition = "TEXT", nullable = false)
    private String englishAnswer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    @JsonIgnore // QUAN TRỌNG: Thêm dòng này để tránh lỗi vòng lặp JSON
    private StudentClass studentClass;
}