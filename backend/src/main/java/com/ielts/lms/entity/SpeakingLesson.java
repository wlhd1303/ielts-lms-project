package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "speaking_lessons")
@Data
@NoArgsConstructor
public class SpeakingLesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // Đoạn văn tiếng Anh gốc

    // Phân loại: Bài này dành cho Lớp Nền tảng hay Nâng cao?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private StudentClass studentClass;
}