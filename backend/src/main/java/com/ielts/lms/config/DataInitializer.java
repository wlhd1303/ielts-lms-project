package com.ielts.lms.config;

import com.ielts.lms.entity.User;
import com.ielts.lms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initAdminAccount(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByUsername("admin_root").ifPresentOrElse(
                user -> {
                    boolean needsUpdate = false;
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        needsUpdate = true;
                    }
                    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                        user.setStatus("ACTIVE");
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        userRepository.save(user);
                        System.out.println(">>> [DataInitializer] Đã cập nhật quyền tài khoản admin_root thành ROLE_ADMIN và ACTIVE");
                    }
                },
                () -> {
                    User admin = new User();
                    admin.setUsername("admin_root");
                    admin.setPasswordHash(passwordEncoder.encode("admin123"));
                    admin.setFullName("Quản trị viên Hệ thống");
                    admin.setRole("ROLE_ADMIN");
                    admin.setStatus("ACTIVE");
                    userRepository.save(admin);
                    System.out.println(">>> [DataInitializer] Đã tự động tạo tài khoản admin_root (mật khẩu: admin123) với quyền ROLE_ADMIN");
                }
            );

            userRepository.findByUsername("admin11").ifPresentOrElse(
                user -> {
                    boolean needsUpdate = false;
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        needsUpdate = true;
                    }
                    if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                        user.setStatus("ACTIVE");
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        userRepository.save(user);
                        System.out.println(">>> [DataInitializer] Đã cập nhật quyền tài khoản admin11 thành ROLE_ADMIN");
                    }
                },
                () -> {
                    User admin = new User();
                    admin.setUsername("admin11");
                    admin.setPasswordHash(passwordEncoder.encode("admin11"));
                    admin.setFullName("Super Administrator");
                    admin.setRole("ROLE_ADMIN");
                    admin.setStatus("ACTIVE");
                    userRepository.save(admin);
                    System.out.println(">>> [DataInitializer] Đã tự động tạo tài khoản super admin admin11 (mật khẩu: admin11) với quyền ROLE_ADMIN");
                }
            );
        };
    }
}
