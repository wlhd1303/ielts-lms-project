package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mock_questions")
@Data
@NoArgsConstructor
public class MockQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_number", nullable = false)
    private Integer questionNumber; 

    // THÊM TRƯỜNG NÀY ĐỂ LƯU NỘI DUNG CÂU HỎI
    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText; 

    @Column(name = "correct_answer", nullable = false)
    private String correctAnswer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    private MockTest mockTest;
}