package com.ielts.lms.booking.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.time.LocalDate;

@Entity
@Table(name = "ta_availabilities", indexes = {
    @Index(name = "idx_ta_avail_date_status", columnList = "available_date, status"),
    @Index(name = "idx_ta_avail_ta_date", columnList = "ta_id, available_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ta_id", nullable = false, length = 100)
    private String taId;

    @Column(name = "ta_name", nullable = false, length = 150)
    private String taName;

    @Column(name = "available_date", nullable = false)
    private LocalDate availableDate;

    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek; // 1: Thứ Hai, ..., 7: Chủ Nhật

    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime; // "HH:mm"

    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime; // "HH:mm"

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String skill = "ALL"; // ALL, SPEAKING, WRITING, READING, LISTENING, GENERAL

    @Column(name = "max_capacity", nullable = false)
    @Builder.Default
    private Integer maxCapacity = 1; // 1: 1-1; 5: Nhóm

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN, FULL, CANCELLED

    @Column(length = 255)
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Timestamp updatedAt;
}
