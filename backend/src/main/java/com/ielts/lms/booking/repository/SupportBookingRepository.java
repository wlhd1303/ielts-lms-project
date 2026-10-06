package com.ielts.lms.booking.repository;

import com.ielts.lms.booking.entity.SupportBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SupportBookingRepository extends JpaRepository<SupportBooking, Long> {

    List<SupportBooking> findByBookingDateAndStatusNot(LocalDate bookingDate, String status);

    List<SupportBooking> findByUserIdOrderByBookingDateDescStartTimeDesc(Long userId);

    List<SupportBooking> findAllByOrderByBookingDateDescStartTimeDesc();

    @Query("SELECT b FROM SupportBooking b WHERE b.bookingDate = :date AND b.status != 'CANCELLED' " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<SupportBooking> findOverlappingBookings(
            @Param("date") LocalDate date,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime
    );

    @Query("SELECT b FROM SupportBooking b WHERE b.user.id = :userId AND b.bookingDate = :date AND b.status != 'CANCELLED' " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<SupportBooking> findUserOverlappingBookings(
            @Param("userId") Long userId,
            @Param("date") LocalDate date,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime
    );

    Optional<SupportBooking> findByIdAndUserId(Long id, Long userId);
}
