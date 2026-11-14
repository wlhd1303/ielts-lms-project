package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.TaAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaAvailabilityRepository extends JpaRepository<TaAvailability, Long> {

    List<TaAvailability> findByAvailableDateAndStatusNotOrderByStartTimeAsc(LocalDate date, String status);

    List<TaAvailability> findByAvailableDateOrderByStartTimeAsc(LocalDate date);

    List<TaAvailability> findByAvailableDateBetweenOrderByAvailableDateAscStartTimeAsc(LocalDate start, LocalDate end);

    List<TaAvailability> findByAvailableDateBetweenAndTaIdOrderByAvailableDateAscStartTimeAsc(LocalDate start, LocalDate end, String taId);

    void deleteByTaIdAndAvailableDateBetween(String taId, LocalDate start, LocalDate end);

    @Query("SELECT t FROM TaAvailability t WHERE t.taId = :taId AND t.availableDate = :date " +
           "AND t.status != 'CANCELLED' " +
           "AND (:startTime < t.endTime AND :endTime > t.startTime)")
    List<TaAvailability> findOverlappingSlots(
            @Param("taId") String taId,
            @Param("date") LocalDate date,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime
    );
}
