package com.ielts.lms.repository;

import com.ielts.lms.entity.MockTest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MockTestRepository extends JpaRepository<MockTest, Long> {
    List<MockTest> findByStudentClassId(Long classId);
}