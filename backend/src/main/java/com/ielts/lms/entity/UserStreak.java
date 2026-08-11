package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_streaks")
@Data
@NoArgsConstructor
public class UserStreak {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int currentStreak = 0;

    @Column(nullable = false)
    private int maxStreak = 0;

    @Column(nullable = false)
    private int currentDayIndex = 1; // Từ ngày 1 đến ngày 80

    private LocalDateTime lastCompletedAt;
}