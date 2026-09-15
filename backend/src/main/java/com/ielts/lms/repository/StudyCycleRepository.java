package com.ielts.lms.repository;

import com.ielts.lms.entity.StudyCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StudyCycleRepository extends JpaRepository<StudyCycle, Long> {
    List<StudyCycle> findByStudentClassIdOrderByCycleOrderAsc(Long classId);
    List<StudyCycle> findByStudentClassIdAndIsActiveTrueOrderByCycleOrderAsc(Long classId);
    void deleteByStudentClassId(Long classId);
}
