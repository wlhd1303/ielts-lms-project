package com.ielts.lms.controller;

import com.ielts.lms.entity.User;
import com.ielts.lms.repository.UserRepository;
import com.ielts.lms.service.StreakService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/streaks")
public class StreakController {

    private final StreakService streakService;
    private final UserRepository userRepository;

    public StreakController(StreakService streakService, UserRepository userRepository) {
        this.streakService = streakService;
        this.userRepository = userRepository;
    }

    @GetMapping("/today")
    public ResponseEntity<Map<String, Object>> getTodayStreak() {
        try {
            // 1. Trích xuất Username trực tiếp từ Spring Security Context
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.ok(buildEmptyResponse());
            }

            String username = authentication.getName();
            Optional<User> userOptional = userRepository.findByUsername(username);

            if (userOptional.isEmpty()) {
                return ResponseEntity.ok(buildEmptyResponse());
            }

            // 2. Gọi Service xử lý lấy bài tập Streak
            Map<String, Object> streakData = streakService.getTodayStreakExercise(userOptional.get());
            return ResponseEntity.ok(streakData);

        } catch (Exception e) {
            // Bắt mọi Exception để không bao giờ bắn ra lỗi 400
            System.err.println("Lỗi xử lý Streak: " + e.getMessage());
            return ResponseEntity.ok(buildEmptyResponse());
        }
    }

    @GetMapping("/admin/dashboard")
    public ResponseEntity<List<Map<String, Object>>> getAdminDashboard() {
        try {
            return ResponseEntity.ok(streakService.getAdminStreakDashboard());
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    // Response mặc định an toàn cho Frontend khi chưa có dữ liệu
    private Map<String, Object> buildEmptyResponse() {
        Map<String, Object> emptyResp = new HashMap<>();
        emptyResp.put("currentStreak", 0);
        emptyResp.put("maxStreak", 0);
        emptyResp.put("currentDayIndex", 1);
        emptyResp.put("moduleType", "DICTATION");
        emptyResp.put("exercise", null);
        emptyResp.put("completedToday", false);
        return emptyResp;
    }
}