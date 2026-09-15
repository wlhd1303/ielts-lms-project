package com.ielts.lms.controller;

import com.ielts.lms.dto.StudyCycleRequest;
import com.ielts.lms.entity.StudyCycle;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.UserRepository;
import com.ielts.lms.service.StudyCycleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/cycles")
public class StudyCycleController {

    private final StudyCycleService studyCycleService;
    private final UserRepository userRepository;

    public StudyCycleController(StudyCycleService studyCycleService, UserRepository userRepository) {
        this.studyCycleService = studyCycleService;
        this.userRepository = userRepository;
    }

    // --- API HỌC VIÊN: LẤY DANH SÁCH VÒNG CỦA LỚP MÌNH ---
    @GetMapping("/my-class")
    public List<StudyCycle> getMyClassCycles() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || user.getStudentClass() == null) {
            return Collections.emptyList();
        }
        return studyCycleService.getActiveCyclesByClass(user.getStudentClass().getId());
    }

    // --- API ADMIN: LẤY DANH SÁCH VÒNG THEO LỚP ---
    @GetMapping("/class/{classId}")
    public List<StudyCycle> getCyclesByClass(@PathVariable Long classId) {
        return studyCycleService.getCyclesByClass(classId);
    }

    @GetMapping("/{cycleId}")
    public StudyCycle getCycleById(@PathVariable Long cycleId) {
        return studyCycleService.getCycleById(cycleId);
    }

    @PostMapping("/class/{classId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StudyCycle> createCycle(@PathVariable Long classId, @RequestBody StudyCycleRequest req) {
        return ResponseEntity.ok(studyCycleService.createCycle(classId, req));
    }

    @PutMapping("/{cycleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StudyCycle> updateCycle(@PathVariable Long cycleId, @RequestBody StudyCycleRequest req) {
        return ResponseEntity.ok(studyCycleService.updateCycle(cycleId, req));
    }

    @DeleteMapping("/{cycleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCycle(@PathVariable Long cycleId) {
        studyCycleService.deleteCycle(cycleId);
        return ResponseEntity.noContent().build();
    }

    // ⚡ API ADMIN: TỰ ĐỘNG GHÉP VÀ SINH CHU KỲ VÒNG XEN KẼ
    @PostMapping("/class/{classId}/auto-generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StudyCycle>> autoGenerate(@PathVariable Long classId) {
        return ResponseEntity.ok(studyCycleService.autoGenerateCyclesForClass(classId));
    }
}
