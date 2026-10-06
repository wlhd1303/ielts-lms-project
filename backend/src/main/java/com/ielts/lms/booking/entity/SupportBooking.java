package com.ielts.lms.booking.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ielts.lms.entity.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.time.LocalDate;

@Entity
@Table(name = "support_bookings")
@Data
@NoArgsConstructor
public class SupportBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"studentClass", "permissions", "passwordHash"})
    private User user;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime; // "HH:mm", e.g. "14:00"

    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime; // "HH:mm", e.g. "14:30" (default 30 mins)

    @Column(nullable = false, length = 100)
    private String skill; // SPEAKING, LISTENING, WRITING, READING, VOCABULARY, GENERAL

    @Column(name = "student_note", columnDefinition = "TEXT")
    private String studentNote;

    @Column(nullable = false, length = 30)
    private String status; // CONFIRMED, COMPLETED, CANCELLED

    @Column(name = "assigned_ta_id")
    private String assignedTaId;

    @Column(name = "assigned_ta_name")
    private String assignedTaName;

    @Column(name = "external_session_id", length = 100)
    private String externalSessionId;

    @Column(name = "is_present")
    private Boolean isPresent;

    @Column(name = "absence_reason", columnDefinition = "TEXT")
    private String absenceReason;

    private Double score;

    @Column(name = "ta_comment", columnDefinition = "TEXT")
    private String taComment;

    @Column(name = "evaluated_at")
    private Timestamp evaluatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Timestamp updatedAt;
}
