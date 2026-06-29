package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_records")
@Data
@NoArgsConstructor
public class StudyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết với Học viên nộp bài
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String moduleType; // Phân loại: SPEAKING, DICTATION, VOCAB, MOCK_TEST, WRITING

    private Long refId; // ID của bài tập gốc (Ví dụ: ID 1 của bảng dictation_topics)
    
    private double score; // Điểm số lưu chung cho mọi module (% hoặc Band)
    private int durationSeconds; // Lượng thời gian làm bài (tính bằng giây)
    
    private LocalDateTime createdAt = LocalDateTime.now(); // Ngày giờ nộp
}