package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.TestEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestEventRepository extends JpaRepository<TestEvent, Long> {

    List<TestEvent> findByStatusOrderByEventDateAsc(String status);

    List<TestEvent> findAllByOrderByEventDateDesc();
}
