package com.ielts.lms.controller;

import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.StudentClassService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
public class StudentClassController {

    private final StudentClassService studentClassService;

    public StudentClassController(StudentClassService studentClassService) {
        this.studentClassService = studentClassService;
    }

    @GetMapping
    public List<StudentClass> getAllClasses() {
        return studentClassService.getAllClasses();
    }

    @PostMapping
    public StudentClass createClass(@RequestBody StudentClass studentClass) {
        return studentClassService.createClass(studentClass);
    }

    // --- ĐƯỜNG LINK MỚI ĐỂ XẾP LỚP ---
    // Ví dụ gọi: POST /api/classes/1/assign/4 (Xếp học viên ID 4 vào Lớp ID 1)
    @PostMapping("/{classId}/assign/{userId}")
    public User assignStudent(@PathVariable Long classId, @PathVariable Long userId) {
        return studentClassService.assignStudentToClass(classId, userId);
    }
}