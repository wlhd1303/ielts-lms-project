package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_streak_logs")
@Data
@NoArgsConstructor
public class UserStreakLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int dayIndex;

    @Column(nullable = false, length = 50)
    private String moduleType;

    @Column(nullable = false)
    private Long refId;

    @Column(nullable = false)
    private LocalDateTime completedAt = LocalDateTime.now();
}