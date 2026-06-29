package com.ielts.lms.repository;

import com.ielts.lms.entity.StudentClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentClassRepository extends JpaRepository<StudentClass, Long> {
    // Chỉ cần kế thừa JpaRepository, Spring Boot đã tự động viết sẵn cho chúng ta 
    // các hàm findAll(), findById(), save(), delete() rồi!
}