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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList; // Bắt buộc phải có thư viện này
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final StudentClassRepository studentClassRepository;
    private final PermissionRepository permissionRepository; 

    public UserService(UserRepository userRepository, JwtService jwtService, RefreshTokenService refreshTokenService, StudentClassRepository studentClassRepository, PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.studentClassRepository = studentClassRepository;
        this.permissionRepository = permissionRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User registerUser(RegisterRequest request) {
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPasswordHash(request.getPassword());
        newUser.setRole("ROLE_USER");
        newUser.setStatus("PENDING"); 
        return userRepository.save(newUser);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy tài khoản!"));

        if (!user.getPasswordHash().equals(request.getPassword())) {
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

    // --- ADMIN DUYỆT, XẾP LỚP VÀ CẤP QUYỀN ---
    @Transactional 
    public User approveAndAssignClass(Long userId, Long classId, List<String> features) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy học viên!"));

        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy Lớp học!"));

        user.setStatus("ACTIVE"); 
        user.setStudentClass(studentClass); 
        
        // 1. Xóa dưới Database
        permissionRepository.deleteByUserId(userId);
        
        // 2. Xóa trong bộ nhớ (Hibernate Cache) để chống lỗi xung đột
        user.setPermissions(new ArrayList<>());

        if (features != null && !features.isEmpty()) {
            for (String featureKey : features) {
                Permission permission = new Permission();
                permission.setUser(user);
                permission.setFeatureKey(featureKey);
                permission.setActive(true); 
                
                permissionRepository.save(permission);
                user.getPermissions().add(permission); // Nhét vào bộ nhớ mới
            }
        }
        return userRepository.save(user);
    }

    // --- CẬP NHẬT QUYỀN TRUY CẬP (DÀNH CHO HỌC VIÊN ĐÃ ACTIVE) ---
    @Transactional 
    public User updatePermissions(Long userId, List<String> features) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy học viên!"));

        // 1. Xóa toàn bộ quyền cũ dưới Database
        permissionRepository.deleteByUserId(userId);

        // 2. QUAN TRỌNG: Ép Hibernate dọn dẹp danh sách quyền cũ trong bộ nhớ (RAM)
        user.setPermissions(new ArrayList<>());

        // 3. Cấp lại các quyền mới được Admin chọn
        if (features != null && !features.isEmpty()) {
            for (String featureKey : features) {
                Permission permission = new Permission();
                permission.setUser(user);
                permission.setFeatureKey(featureKey);
                permission.setActive(true); 
                
                permissionRepository.save(permission);
                user.getPermissions().add(permission); // Cập nhật lại RAM
            }
        }
        
        return userRepository.save(user);
    }
}