package com.ielts.lms.booking.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "test_event_shifts")
@Data
@NoArgsConstructor
public class TestEventShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonBackReference
    private TestEvent testEvent;

    @Column(name = "shift_name", nullable = false)
    private String shiftName; // e.g. "Ca 1 (08:30 - 11:30)"

    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime; // "08:30"

    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime; // "11:30"

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity; // Số lượng học viên tối đa

    @Column(name = "current_registered", nullable = false)
    private Integer currentRegistered = 0;
}
