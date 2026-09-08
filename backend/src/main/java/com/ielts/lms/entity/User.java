package com.ielts.lms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name")
    private String fullName;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String passwordHash;

    @Column(nullable = false)
    private String role; // ROLE_ADMIN, ROLE_USER

    @Column(nullable = false)
    private String status; // PENDING, ACTIVE

    // ⚡ Bổ sung trường ngày thi mục tiêu của học viên (Dùng cho tính năng Countdown)
    @Column(name = "target_exam_date")
    private LocalDate targetExamDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;

    // Nối với bảng Lớp học
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "class_id")
    @JsonIgnoreProperties("users") // Ngăn vòng lặp từ Class quay về User
    private StudentClass studentClass;

    // Nối với bảng permissions
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("user") // Chặn Permission gọi ngược lại User
    private List<Permission> permissions;
}