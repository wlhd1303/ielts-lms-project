package com.ielts.lms.booking.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_events")
@Data
@NoArgsConstructor
public class TestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(nullable = false)
    private String location; // e.g. "Phòng Lab 2 - Cơ sở chính"

    @Column(name = "registration_deadline")
    private LocalDateTime registrationDeadline;

    @Column(nullable = false, length = 30)
    private String status; // OPEN, CLOSED, COMPLETED

    @Column(name = "exam_format", length = 20)
    private String examFormat = "OFFLINE"; // OFFLINE, ONLINE

    @Column(name = "skill_type", length = 20)
    private String skillType; // LISTENING, READING, BOTH

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 60;

    @Column(name = "pdf_url", columnDefinition = "TEXT")
    private String pdfUrl;

    @Column(name = "audio_url", columnDefinition = "TEXT")
    private String audioUrl;

    @Column(name = "passage_text", columnDefinition = "LONGTEXT")
    private String passageText;

    @Column(name = "allow_review")
    private Boolean allowReview = true;

    @OneToMany(mappedBy = "testEvent", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    @JsonManagedReference
    private List<TestEventShift> shifts = new ArrayList<>();

    @OneToMany(mappedBy = "testEvent", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TestEventQuestion> questions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Timestamp createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Timestamp updatedAt;
}
