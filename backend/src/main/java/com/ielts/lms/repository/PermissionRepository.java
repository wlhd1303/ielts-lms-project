package com.ielts.lms.repository;

import com.ielts.lms.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    
    // Tự động generate câu lệnh: DELETE FROM permissions WHERE user_id = ?
    void deleteByUserId(Long userId);
}