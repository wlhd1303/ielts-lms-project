package com.ielts.lms.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
    }

    @Test
    @DisplayName("TC-JWT-01: Tạo token mặc định gán role ROLE_USER và giải mã chính xác")
    void testGenerateToken_DefaultRole() {
        String username = "student_phong";
        String token = jwtService.generateToken(username);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo(username);
        assertThat(jwtService.extractRole(token)).isEqualTo("ROLE_USER");
        assertThat(jwtService.isTokenValid(token, username)).isTrue();
    }

    @Test
    @DisplayName("TC-JWT-02: Tạo token với role ROLE_ADMIN và xác thực hợp lệ")
    void testGenerateToken_AdminRole() {
        String adminUser = "admin_master";
        String token = jwtService.generateToken(adminUser, "ROLE_ADMIN");

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo(adminUser);
        assertThat(jwtService.extractRole(token)).isEqualTo("ROLE_ADMIN");
        assertThat(jwtService.isTokenValid(token, adminUser)).isTrue();
    }

    @Test
    @DisplayName("TC-JWT-03: Token không hợp lệ khi kiểm tra với username khác")
    void testIsTokenValid_WrongUsername() {
        String token = jwtService.generateToken("user_a");
        assertThat(jwtService.isTokenValid(token, "user_b")).isFalse();
    }

    @Test
    @DisplayName("TC-JWT-04: Token bị sửa đổi/giả mạo phải ném ra ngoại lệ bảo mật")
    void testTamperedToken_Throws() {
        String token = jwtService.generateToken("valid_user");
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        assertThatThrownBy(() -> jwtService.extractUsername(tamperedToken))
                .isInstanceOf(Exception.class);
    }
}
