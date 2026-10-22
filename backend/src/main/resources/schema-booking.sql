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

-- ==============================================================================
-- 5. MIGRATION BỔ SUNG: TÍNH NĂNG THI ONLINE CHO SỰ KIỆN (TEST EVENTS ONLINE)
-- ==============================================================================

-- Bổ sung các trường cấu hình thi online vào test_events
ALTER TABLE test_events 
    ADD COLUMN IF NOT EXISTS exam_format VARCHAR(20) DEFAULT 'OFFLINE',
    ADD COLUMN IF NOT EXISTS skill_type VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60,
    ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS passage_text LONGTEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS allow_review BOOLEAN DEFAULT TRUE;

-- Bảng lưu trữ 40 câu hỏi và bảng đáp án đề thi sự kiện
CREATE TABLE IF NOT EXISTS test_event_questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    skill VARCHAR(20) NOT NULL,
    question_number INT NOT NULL,
    question_text TEXT,
    correct_answer VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_question_event FOREIGN KEY (event_id) REFERENCES test_events(id) ON DELETE CASCADE,
    INDEX idx_event_question_event_skill (event_id, skill, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bổ sung các trường theo dõi làm bài và điểm số chi tiết vào test_event_registrations
ALTER TABLE test_event_registrations
    ADD COLUMN IF NOT EXISTS exam_started_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS exam_submitted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS student_answers LONGTEXT NULL,
    ADD COLUMN IF NOT EXISTS listening_correct_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reading_correct_count INT DEFAULT 0;

