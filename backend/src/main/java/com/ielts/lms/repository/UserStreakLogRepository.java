package com.ielts.lms.repository;

import com.ielts.lms.entity.UserStreakLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserStreakLogRepository extends JpaRepository<UserStreakLog, Long> {
    List<UserStreakLog> findByUserId(Long userId);
    boolean existsByUserIdAndDayIndex(Long userId, int dayIndex);
}