package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "permissions")
@Data
@NoArgsConstructor
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feature_key", nullable = false)
    private String featureKey; // Ví dụ: "SPEAKING", "DICTATION", "MOCK_TEST"

    @Column(name = "is_active", nullable = false)
    private boolean isActive = false; // Mặc định tạo ra là bị khóa (false)

    // Quyền này thuộc về Học viên nào?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}