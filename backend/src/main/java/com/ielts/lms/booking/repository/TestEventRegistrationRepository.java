package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.TestEventRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestEventRegistrationRepository extends JpaRepository<TestEventRegistration, Long> {

    List<TestEventRegistration> findByShiftId(Long shiftId);

    List<TestEventRegistration> findByUserIdOrderByRegisteredAtDesc(Long userId);

    Optional<TestEventRegistration> findByShiftIdAndUserId(Long shiftId, Long userId);

    boolean existsByShiftIdAndUserIdAndStatusNot(Long shiftId, Long userId, String status);
}
