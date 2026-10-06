-- ==============================================================================
-- MIGRATION SCRIPT: Hệ thống Đặt lịch hỗ trợ 1-1 (30p) & Đợt Thi thử Mock Test
-- Tương thích: MySQL 8.x / MariaDB
-- Cơ chế: Tự động chạy an toàn với IF NOT EXISTS (không gây mất dữ liệu hiện hữu)
-- ==============================================================================

-- 1. Bảng lưu trữ ca hỗ trợ 1-1 30 phút giữa học viên và trợ giảng/giáo viên
CREATE TABLE IF NOT EXISTS support_bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    skill VARCHAR(50) NOT NULL,
    student_note TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    assigned_ta_id VARCHAR(100),
    assigned_ta_name VARCHAR(150),
    is_present BOOLEAN,
    absence_reason TEXT,
    score DOUBLE,
    ta_comment TEXT,
    external_session_id VARCHAR(100),
    evaluated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_support_booking_date_status (booking_date, status),
    INDEX idx_support_booking_user (user_id),
    INDEX idx_support_booking_external (external_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng quản lý các đợt thi thử IELTS tập trung (Mock Test Events)
CREATE TABLE IF NOT EXISTS test_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    registration_deadline TIMESTAMP NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_event_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_test_event_date_status (event_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng phân ca thi trong từng đợt thi thử (Sáng / Chiều / Tối)
CREATE TABLE IF NOT EXISTS test_event_shifts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    max_capacity INT NOT NULL DEFAULT 20,
    current_registered INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_test_shift_event FOREIGN KEY (event_id) REFERENCES test_events(id) ON DELETE CASCADE,
    INDEX idx_test_shift_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng ghi nhận danh sách học viên đăng ký ca thi và điểm thi 4 kỹ năng
CREATE TABLE IF NOT EXISTS test_event_registrations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shift_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
    score_listening DOUBLE,
    score_reading DOUBLE,
    score_writing DOUBLE,
    score_speaking DOUBLE,
    overall_score DOUBLE,
    feedback TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_reg_shift FOREIGN KEY (shift_id) REFERENCES test_event_shifts(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_reg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_test_reg_shift_user (shift_id, user_id),
    INDEX idx_test_reg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
