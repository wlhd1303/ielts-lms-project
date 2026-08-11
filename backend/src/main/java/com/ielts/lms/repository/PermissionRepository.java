package com.ielts.lms.repository;

import com.ielts.lms.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    
    @Modifying
    @Transactional
    @Query("DELETE FROM Permission p WHERE p.user.id = :userId")
    void deleteByUserId(Long userId);
}