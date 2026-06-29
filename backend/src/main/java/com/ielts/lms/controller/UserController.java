package com.ielts.lms.controller;

import com.ielts.lms.dto.AuthResponse;
import com.ielts.lms.dto.LoginRequest;
import com.ielts.lms.dto.RegisterRequest;
import com.ielts.lms.entity.User;
import com.ielts.lms.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        // Trả về HTTP Status 400 kèm JSON: { "message": "Lỗi: Sai mật khẩu!" }
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
        // Thay vì trả thẳng User, ta bọc trong ResponseEntity cho chuẩn form
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/me")
    public User getMyProfile() {
        return userService.getMyProfile();
    }

    // --- ĐƯỜNG LINK: ADMIN DUYỆT, XẾP LỚP VÀ PHÂN QUYỀN ---
    @PutMapping("/{userId}/approve")
    public User approveUser(@PathVariable Long userId, @RequestParam Long classId, @RequestBody Map<String, List<String>> body) {
        List<String> features = body.get("features"); // Lấy mảng features từ body do ReactJS gửi lên
        return userService.approveAndAssignClass(userId, classId, features);
    }

    // --- ĐƯỜNG LINK MỚI: CẬP NHẬT QUYỀN CHO HỌC VIÊN ĐANG HỌC ---
    @PutMapping("/{userId}/permissions")
    public User updatePermissions(@PathVariable Long userId, @RequestBody Map<String, List<String>> body) {
        List<String> features = body.get("features");
        return userService.updatePermissions(userId, features);
    }
}