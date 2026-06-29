package com.ielts.lms.service;

import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.StudentClassRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentClassService {

    private final StudentClassRepository studentClassRepository;
    private final UserRepository userRepository; // Mượn thêm kho dữ liệu của User

    // Tiêm cả 2 kho vào Service này
    public StudentClassService(StudentClassRepository studentClassRepository, UserRepository userRepository) {
        this.studentClassRepository = studentClassRepository;
        this.userRepository = userRepository;
    }

    public List<StudentClass> getAllClasses() {
        return studentClassRepository.findAll();
    }

    public StudentClass createClass(StudentClass studentClass) {
        return studentClassRepository.save(studentClass);
    }

    // --- TÍNH NĂNG MỚI: XẾP HỌC VIÊN VÀO LỚP ---
    public User assignStudentToClass(Long classId, Long userId) {
        // 1. Tìm xem lớp học có tồn tại không
        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy Lớp học với ID này!"));

        // 2. Tìm xem học viên có tồn tại không
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy Học viên với ID này!"));

        // 3. Gắn lớp cho học viên (Cập nhật cột student_class_id trong bảng users)
        user.setStudentClass(studentClass);
        
        // 4. Lưu học viên lại xuống Database
        return userRepository.save(user);
    }
}