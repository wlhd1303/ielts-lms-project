package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.TestEventShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestEventShiftRepository extends JpaRepository<TestEventShift, Long> {

    List<TestEventShift> findByTestEventId(Long eventId);
}
