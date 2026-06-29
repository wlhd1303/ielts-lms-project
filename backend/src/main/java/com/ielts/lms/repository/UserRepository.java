package com.ielts.lms.repository;

import com.ielts.lms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Spring Boot có tính năng "Ma thuật từ ngữ" (Query Creation).
    // Chỉ cần đặt tên hàm đúng quy tắc chữ cái, nó tự sinh ra câu lệnh SQL!
    // Hàm dưới đây tương đương: SELECT * FROM users WHERE username = ?
    Optional<User> findByUsername(String username);
    
    // Tương đương: SELECT * FROM users WHERE status = 'PENDING'
    List<User> findByStatus(String status);
}