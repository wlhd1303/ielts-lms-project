package com.ielts.lms.controller;

import com.ielts.lms.dto.AuthResponse;
import com.ielts.lms.dto.LoginRequest;
import com.ielts.lms.dto.RegisterRequest;
import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // --- BẮT LỖI VÀ CHUYỂN THÀNH MÃ 400 CHO FRONTEND ---
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/register")
    public User register(@RequestBody RegisterRequest request) {
        return userService.registerUser(request);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/me")
    public User getMyProfile() {
        return userService.getMyProfile();
    }

    // ⚡ TÍNH NĂNG MỚI: HỌC VIÊN TỰ ĐẶT / CẬP NHẬT NGÀY THI MỤC TIÊU
    @PutMapping("/me/exam-date")
    public User updateMyExamDate(@RequestBody Map<String, String> payload) {
        String dateStr = payload.get("examDate");
        LocalDate date = (dateStr != null && !dateStr.trim().isEmpty()) ? LocalDate.parse(dateStr.trim()) : null;
        return userService.updateTargetExamDate(date);
    }

    // --- ĐƯỜNG LINK: ADMIN DUYỆT, XẾP LỚP VÀ PHÂN QUYỀN ---
    @PutMapping("/{userId}/approve")
    public User approveUser(@PathVariable Long userId, @RequestParam Long classId, @RequestBody Map<String, List<String>> body) {
        List<String> features = body.get("features");
        return userService.approveAndAssignClass(userId, classId, features);
    }

    // --- ĐƯỜNG LINK: CẬP NHẬT QUYỀN CHO HỌC VIÊN ĐANG HỌC ---
    @PutMapping("/{userId}/permissions")
    public User updatePermissions(@PathVariable Long userId, @RequestBody Map<String, List<String>> body) {
        List<String> features = body.get("features");
        return userService.updatePermissions(userId, features);
    }

    // --- TÍNH NĂNG MỚI: ADMIN TẠO LỚP HỌC MỚI ---
    @PostMapping("/classes")
    public StudentClass createClass(@RequestBody Map<String, String> body) {
        String className = body.get("name");
        return userService.createClass(className);
    }

    // --- TÍNH NĂNG MỚI: ADMIN ĐỔI LỚP HỌC VIÊN ---
    @PutMapping("/{userId}/class")
    public User updateStudentClass(@PathVariable Long userId, @RequestBody Map<String, Long> body) {
        Long classId = body.get("classId");
        return userService.updateStudentClass(userId, classId);
    }
}