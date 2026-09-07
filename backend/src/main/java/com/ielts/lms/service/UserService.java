package com.ielts.lms.service;

import com.ielts.lms.dto.AuthResponse;
import com.ielts.lms.dto.LoginRequest;
import com.ielts.lms.dto.RegisterRequest;
import com.ielts.lms.entity.Permission;
import com.ielts.lms.entity.RefreshToken;
import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.PermissionRepository;
import com.ielts.lms.repository.StudentClassRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final StudentClassRepository studentClassRepository;
    private final PermissionRepository permissionRepository; 
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, 
                       JwtService jwtService, 
                       RefreshTokenService refreshTokenService, 
                       StudentClassRepository studentClassRepository, 
                       PermissionRepository permissionRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.studentClassRepository = studentClassRepository;
        this.permissionRepository = permissionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User registerUser(RegisterRequest request) {
        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        if (username.isEmpty()) {
            throw new RuntimeException("Lỗi: Tên đăng nhập không được để trống!");
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Lỗi: Tên đăng nhập này đã được sử dụng, vui lòng chọn tên khác!");
        }

        User newUser = new User();
        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            newUser.setFullName(request.getFullName().trim());
        }
        newUser.setUsername(username);
        newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newUser.setRole("ROLE_USER");
        newUser.setStatus("PENDING"); 
        return userRepository.save(newUser);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy tài khoản!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Lỗi: Sai mật khẩu!");
        }

        String accessToken = jwtService.generateToken(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken.getToken());
        response.setUsername(user.getUsername());
        response.setRole(user.getRole());

        return response;
    }

    public User getMyProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản"));
    }

    // ⚡ TÍNH NĂNG MỚI: HỌC VIÊN CẬP NHẬT NGÀY THI MỤC TIÊU
    @Transactional
    public User updateTargetExamDate(LocalDate examDate) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = authentication.getName();
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học viên!"));

        user.setTargetExamDate(examDate);
        return userRepository.save(user);
    }

    // --- ADMIN DUYỆT, XẾP LỚP VÀ CẤP QUYỀN ---
    @Transactional 
    public User approveAndAssignClass(Long userId, Long classId, List<String> features) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy học viên!"));

        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy Lớp học!"));

        user.setStatus("ACTIVE"); 
        user.setStudentClass(studentClass); 
        
        permissionRepository.deleteByUserId(userId);
        user.setPermissions(new ArrayList<>());

        if (features != null && !features.isEmpty()) {
            for (String featureKey : features) {
                Permission permission = new Permission();
                permission.setUser(user);
                permission.setFeatureKey(featureKey);
                permission.setActive(true); 
                
                permissionRepository.save(permission);
                user.getPermissions().add(permission);
            }
        }
        return userRepository.save(user);
    }

    // --- CẬP NHẬT QUYỀN TRUY CẬP (DÀNH CHO HỌC VIÊN ĐÃ ACTIVE) ---
    @Transactional 
    public User updatePermissions(Long userId, List<String> features) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy học viên!"));

        permissionRepository.deleteByUserId(userId);
        user.setPermissions(new ArrayList<>());

        if (features != null && !features.isEmpty()) {
            for (String featureKey : features) {
                Permission permission = new Permission();
                permission.setUser(user);
                permission.setFeatureKey(featureKey);
                permission.setActive(true); 
                
                permissionRepository.save(permission);
                user.getPermissions().add(permission);
            }
        }
        
        return userRepository.save(user);
    }

    // --- TÍNH NĂNG MỚI: ADMIN TẠO LỚP HỌC MỚI ---
    public StudentClass createClass(String className) {
        if (className == null || className.trim().isEmpty()) {
            throw new RuntimeException("Lỗi: Tên lớp học không được để trống!");
        }
        StudentClass studentClass = new StudentClass();
        studentClass.setName(className.trim());
        return studentClassRepository.save(studentClass);
    }

    // --- TÍNH NĂNG MỚI: ADMIN ĐỔI LỚP HỌC VIÊN ---
    @Transactional
    public User updateStudentClass(Long userId, Long classId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy học viên!"));

        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy Lớp học!"));

        user.setStudentClass(studentClass);
        return userRepository.save(user);
    }
}