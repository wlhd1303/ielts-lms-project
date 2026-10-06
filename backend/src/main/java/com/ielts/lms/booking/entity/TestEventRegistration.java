package com.ielts.lms.booking.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ielts.lms.entity.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "test_event_registrations")
@Data
@NoArgsConstructor
public class TestEventRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shift_id", nullable = false)
    private TestEventShift shift;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"studentClass", "permissions", "passwordHash"})
    private User user;

    @Column(name = "full_name")
    private String fullName;

    private String phone;

    private String email;

    @Column(nullable = false, length = 30)
    private String status; // REGISTERED, ATTENDED, ABSENT, CANCELLED

    @Column(name = "score_listening")
    private Double scoreListening;

    @Column(name = "score_reading")
    private Double scoreReading;

    @Column(name = "score_writing")
    private Double scoreWriting;

    @Column(name = "score_speaking")
    private Double scoreSpeaking;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @CreationTimestamp
    @Column(name = "registered_at", updatable = false)
    private Timestamp registeredAt;
}
