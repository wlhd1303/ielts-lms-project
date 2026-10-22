package com.ielts.lms.booking.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "test_event_questions")
@Data
@NoArgsConstructor
public class TestEventQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonBackReference
    private TestEvent testEvent;

    @Column(nullable = false, length = 20)
    private String skill; // LISTENING or READING

    @Column(name = "question_number", nullable = false)
    private Integer questionNumber; // 1 to 40

    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "correct_answer", nullable = false)
    private String correctAnswer;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;
}
