package com.ielts.lms.booking.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Adapter Service đọc dữ liệu từ Database bên kia (DB 2 - Supabase PostgreSQL) theo cơ chế Read-Only.
 * Tuyệt đối không ghi đè, không sửa đổi dữ liệu DB 2.
 * Hoạt động an toàn: Nếu lỗi mạng hoặc chưa cấu hình, service tự động chạy ở chế độ Standalone.
 */
@Service
@Slf4j
public class ExternalDbSyncService {

    @Value("${external.datasource.url:}")
    private String externalDbUrl;

    @Value("${external.datasource.username:}")
    private String externalDbUsername;

    @Value("${external.datasource.password:}")
    private String externalDbPassword;

    @Data
    public static class ExternalTaDto {
        private String id;
        private String fullName;
        private String email;
        private String phone;
    }

    @Data
    public static class ExternalBusySlotDto {
        private String id;
        private String taId;
        private LocalDate date;
        private String startTime;
        private String endTime;
    }

    /**
     * Kiểm tra xem cấu hình kết nối DB 2 đã được cung cấp chưa
     */
    public boolean isExternalDbConfigured() {
        return externalDbUrl != null && !externalDbUrl.trim().isEmpty();
    }

    /**
     * Tự động bóc tách chuỗi kết nối chuẩn Postgres (postgresql://user:pass@host:port/db)
     * sang JDBC URL hợp lệ của PostgreSQL driver kèm SSL require
     */
    private Connection createConnection() throws Exception {
        String rawUrl = externalDbUrl.trim();
        String jdbcUrl;
        String user = externalDbUsername;
        String pass = externalDbPassword;

        if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
            URI uri = new URI(rawUrl.replaceFirst("^postgres://", "postgresql://"));
            String host = uri.getHost();
            int port = uri.getPort() != -1 ? uri.getPort() : 5432;
            String path = uri.getPath() != null && !uri.getPath().isEmpty() ? uri.getPath() : "/postgres";
            String userInfo = uri.getUserInfo();
            if (userInfo != null && userInfo.contains(":")) {
                String[] parts = userInfo.split(":", 2);
                user = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                pass = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
            }
            jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
            if (!jdbcUrl.contains("sslmode=")) {
                jdbcUrl += "?sslmode=require&prepareThreshold=0&connectTimeout=3&socketTimeout=5";
            } else {
                if (!jdbcUrl.contains("prepareThreshold=")) jdbcUrl += "&prepareThreshold=0";
                if (!jdbcUrl.contains("connectTimeout=")) jdbcUrl += "&connectTimeout=3";
                if (!jdbcUrl.contains("socketTimeout=")) jdbcUrl += "&socketTimeout=5";
            }
        } else if (!rawUrl.startsWith("jdbc:")) {
            jdbcUrl = "jdbc:" + rawUrl;
            if (!jdbcUrl.contains("sslmode=")) {
                jdbcUrl += (jdbcUrl.contains("?") ? "&" : "?") + "sslmode=require&prepareThreshold=0&connectTimeout=3&socketTimeout=5";
            } else {
                if (!jdbcUrl.contains("prepareThreshold=")) jdbcUrl += "&prepareThreshold=0";
                if (!jdbcUrl.contains("connectTimeout=")) jdbcUrl += "&connectTimeout=3";
                if (!jdbcUrl.contains("socketTimeout=")) jdbcUrl += "&socketTimeout=5";
            }
        } else {
            jdbcUrl = rawUrl;
        }

        Exception lastEx = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                return DriverManager.getConnection(jdbcUrl, user, pass);
            } catch (Exception e) {
                lastEx = e;
                if (attempt < 3) {
                    try { Thread.sleep(400); } catch (InterruptedException ignored) {}
                }
            }
        }
        throw lastEx;
    }

    /**
     * Kiểm tra kết nối thử tới DB 2
     */
    public boolean testConnection() {
        if (!isExternalDbConfigured()) {
            return false;
        }
        try (Connection conn = createConnection()) {
            return conn != null && !conn.isClosed();
        } catch (Exception e) {
            log.warn("Kiểm tra kết nối tới DB 2 thất bại: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Lấy danh sách Trợ giảng từ bảng public.users của DB 2
     */
    public List<ExternalTaDto> getTeachingAssistants() {
        List<ExternalTaDto> result = new ArrayList<>();
        if (!isExternalDbConfigured()) {
            return result;
        }

        String sql = "SELECT id, full_name, email, phone FROM public.users " +
                     "WHERE role = 'TEACHING_ASSISTANT'::users_role_enum AND is_active = true ORDER BY full_name ASC";
        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                ExternalTaDto ta = new ExternalTaDto();
                ta.setId(rs.getString("id"));
                ta.setFullName(rs.getString("full_name"));
                ta.setEmail(rs.getString("email"));
                ta.setPhone(rs.getString("phone"));
                result.add(ta);
            }
            log.info("Đã đồng bộ {} Trợ giảng từ DB 2", result.size());
        } catch (Exception e) {
            log.warn("Không thể đọc danh sách Trợ giảng từ DB 2: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Lấy các ca bận của Trợ giảng trong ngày từ bảng public.support_sessions của DB 2
     */
    public List<ExternalBusySlotDto> getBusySlotsForDate(LocalDate date) {
        List<ExternalBusySlotDto> result = new ArrayList<>();
        if (!isExternalDbConfigured()) {
            return result;
        }

        String sql = "SELECT id, teaching_assistant_id, session_date, start_time, end_time " +
                     "FROM public.support_sessions WHERE session_date = ? AND status != 'CANCELLED'::support_sessions_status_enum";
        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setDate(1, java.sql.Date.valueOf(date));
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ExternalBusySlotDto slot = new ExternalBusySlotDto();
                    slot.setId(rs.getString("id"));
                    slot.setTaId(rs.getString("teaching_assistant_id"));
                    slot.setDate(rs.getDate("session_date").toLocalDate());
                    slot.setStartTime(rs.getString("start_time"));
                    slot.setEndTime(rs.getString("end_time"));
                    result.add(slot);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể đọc ca bận từ DB 2 cho ngày {}: {}", date, e.getMessage());
        }
        return result;
    }

    /**
     * Đồng bộ đặt lịch từ LMS sang bảng public.support_sessions của DB 2
     * Tự động tìm/tạo Class LMS-SUPPORT, tìm/tạo Student, lấy Teacher & TA tương ứng.
     * Trả về externalSessionId (UUID dạng String) nếu thành công, hoặc null nếu lỗi.
     */
    public String syncSupportSessionToExternalDb(com.ielts.lms.booking.entity.SupportBooking booking) {
        if (!isExternalDbConfigured() || booking == null) {
            return null;
        }

        try (Connection conn = createConnection()) {
            // 1. Tìm hoặc tạo Class hỗ trợ mặc định
            String classId = null;
            try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.classes WHERE code = 'LMS-SUPPORT' LIMIT 1");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    classId = rs.getString("id");
                }
            }

            if (classId == null) {
                // Kiểm tra xem có lớp nào sẵn có không
                try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.classes LIMIT 1");
                     ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        classId = rs.getString("id");
                    }
                }
            }

            if (classId == null) {
                // Tạo lớp LMS-SUPPORT
                String insertClassSql = "INSERT INTO public.classes (id, name, code, level, status, created_at, updated_at) " +
                                        "VALUES (gen_random_uuid(), 'Lớp Hỗ Trợ IELTS LMS 1-on-1', 'LMS-SUPPORT', 'BASIC'::classes_level_enum, 'ACTIVE'::classes_status_enum, NOW(), NOW()) " +
                                        "RETURNING id";
                try (PreparedStatement stmt = conn.prepareStatement(insertClassSql);
                     ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        classId = rs.getString("id");
                    }
                }
            }

            // 2. Tìm hoặc tạo Student theo email
            String studentId = null;
            String studentUsername = booking.getUser() != null ? booking.getUser().getUsername() : null;
            String studentEmail = (studentUsername != null && studentUsername.contains("@"))
                    ? studentUsername
                    : (studentUsername != null ? studentUsername + "@ielts.local" : "student_" + System.currentTimeMillis() + "@ielts.local");
            String studentName = (booking.getUser() != null && booking.getUser().getFullName() != null)
                    ? booking.getUser().getFullName()
                    : (studentUsername != null ? studentUsername : "Học viên LMS");

            try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.students WHERE email = ? LIMIT 1")) {
                stmt.setString(1, studentEmail);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        studentId = rs.getString("id");
                    }
                }
            }

            if (studentId == null) {
                String insertStudentSql = "INSERT INTO public.students (id, full_name, email, status, created_at, updated_at) " +
                                          "VALUES (gen_random_uuid(), ?, ?, 'ACTIVE'::students_status_enum, NOW(), NOW()) RETURNING id";
                try (PreparedStatement stmt = conn.prepareStatement(insertStudentSql)) {
                    stmt.setString(1, studentName);
                    stmt.setString(2, studentEmail);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) {
                            studentId = rs.getString("id");
                        }
                    }
                }
            }

            // 3. Lấy Teacher
            String teacherId = null;
            try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.users WHERE role = 'TEACHER'::users_role_enum AND is_active = true LIMIT 1");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    teacherId = rs.getString("id");
                }
            }
            if (teacherId == null) {
                try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.users LIMIT 1");
                     ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) teacherId = rs.getString("id");
                }
            }

            // 4. Lấy Teaching Assistant
            String taId = booking.getAssignedTaId();
            if (taId == null || taId.trim().isEmpty()) {
                try (PreparedStatement stmt = conn.prepareStatement("SELECT id FROM public.users WHERE role = 'TEACHING_ASSISTANT'::users_role_enum AND is_active = true LIMIT 1");
                     ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        taId = rs.getString("id");
                    }
                }
            }

            // 5. INSERT vào support_sessions
            String skill = booking.getSkill() != null ? booking.getSkill() : "GENERAL";
            String note = booking.getStudentNote() != null ? booking.getStudentNote() : "Đặt lịch từ IELTS LMS";

            String insertSessionSql = "INSERT INTO public.support_sessions (" +
                                      "id, class_id, student_id, teacher_id, teaching_assistant_id, " +
                                      "session_date, start_time, end_time, skills, status, " +
                                      "teacher_note, created_at, updated_at" +
                                      ") VALUES (" +
                                      "gen_random_uuid(), ?::uuid, ?::uuid, ?::uuid, ?::uuid, " +
                                      "?, ?, ?, ARRAY[?], 'PENDING'::support_sessions_status_enum, " +
                                      "?, NOW(), NOW()" +
                                      ") RETURNING id";

            try (PreparedStatement stmt = conn.prepareStatement(insertSessionSql)) {
                stmt.setString(1, classId);
                stmt.setString(2, studentId);
                stmt.setString(3, teacherId);
                stmt.setString(4, taId);
                stmt.setDate(5, java.sql.Date.valueOf(booking.getBookingDate()));
                stmt.setString(6, booking.getStartTime());
                stmt.setString(7, booking.getEndTime());
                stmt.setString(8, skill);
                stmt.setString(9, note);

                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String sessionId = rs.getString("id");
                        log.info("Đã đồng bộ thành công buổi hỗ trợ sang DB 2 với UUID: {}", sessionId);
                        return sessionId;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi đồng bộ buổi hỗ trợ sang DB 2: {}", e.getMessage(), e);
        }
        return null;
    }

    /**
     * Đồng bộ hủy lịch sang bảng public.support_sessions của DB 2 theo mã UUID
     */
    public boolean cancelExternalSupportSession(String externalSessionId) {
        if (!isExternalDbConfigured() || externalSessionId == null || externalSessionId.trim().isEmpty()) {
            return false;
        }

        String sql = "UPDATE public.support_sessions SET status = 'CANCELLED'::support_sessions_status_enum, updated_at = NOW() WHERE id = ?::uuid";
        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, externalSessionId);
            int rows = stmt.executeUpdate();
            log.info("Đã cập nhật hủy lịch trên DB 2 cho session {}: {} dòng ảnh hưởng", externalSessionId, rows);
            return rows > 0;
        } catch (Exception e) {
            log.warn("Không thể hủy lịch trên DB 2 cho session {}: {}", externalSessionId, e.getMessage());
            return false;
        }
    }

    /**
     * Đồng bộ hủy lịch thông minh kèm cơ chế dự phòng (Fallback):
     * 1. Hủy theo externalSessionId nếu có.
     * 2. Nếu externalSessionId rỗng hoặc chưa khớp, tìm và hủy theo ngày, giờ bắt đầu và giờ kết thúc.
     */
    public boolean cancelExternalSupportSession(com.ielts.lms.booking.entity.SupportBooking booking) {
        if (!isExternalDbConfigured() || booking == null) {
            return false;
        }

        // 1. Thử hủy theo externalSessionId
        if (booking.getExternalSessionId() != null && !booking.getExternalSessionId().trim().isEmpty()) {
            boolean success = cancelExternalSupportSession(booking.getExternalSessionId());
            if (success) {
                return true;
            }
        }

        // 2. Cơ chế dự phòng (Fallback): Tìm theo ngày và khung giờ trên DB 2
        String sql = "UPDATE public.support_sessions SET status = 'CANCELLED'::support_sessions_status_enum, updated_at = NOW() " +
                     "WHERE session_date = ? AND start_time = ? AND end_time = ? " +
                     "AND status != 'CANCELLED'::support_sessions_status_enum";
        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setDate(1, java.sql.Date.valueOf(booking.getBookingDate()));
            stmt.setString(2, booking.getStartTime());
            stmt.setString(3, booking.getEndTime());
            int rows = stmt.executeUpdate();
            log.info("Đã cập nhật hủy lịch dự phòng trên DB 2 cho ngày {} {}-{}: {} dòng ảnh hưởng",
                    booking.getBookingDate(), booking.getStartTime(), booking.getEndTime(), rows);
            return rows > 0;
        } catch (Exception e) {
            log.warn("Không thể hủy lịch dự phòng trên DB 2: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Đồng bộ xóa cứng (Hard Delete) ca hỗ trợ trên DB 2:
     * Dùng khi Admin hoặc người dùng muốn xóa hoàn toàn dữ liệu ca hỗ trợ khỏi hệ thống web bên kia.
     */
    public boolean deleteExternalSupportSession(com.ielts.lms.booking.entity.SupportBooking booking) {
        if (!isExternalDbConfigured() || booking == null) {
            return false;
        }

        // 1. Xóa theo externalSessionId nếu có
        if (booking.getExternalSessionId() != null && !booking.getExternalSessionId().trim().isEmpty()) {
            String sql = "DELETE FROM public.support_sessions WHERE id = ?::uuid";
            try (Connection conn = createConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, booking.getExternalSessionId());
                int rows = stmt.executeUpdate();
                log.info("Đã xóa cứng session {} trên DB 2: {} dòng", booking.getExternalSessionId(), rows);
                if (rows > 0) return true;
            } catch (Exception e) {
                log.warn("Không thể xóa session trên DB 2 theo ID {}: {}", booking.getExternalSessionId(), e.getMessage());
            }
        }

        // 2. Dự phòng: Xóa theo ngày và khung giờ
        String fallbackSql = "DELETE FROM public.support_sessions WHERE session_date = ? AND start_time = ? AND end_time = ?";
        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(fallbackSql)) {
            stmt.setDate(1, java.sql.Date.valueOf(booking.getBookingDate()));
            stmt.setString(2, booking.getStartTime());
            stmt.setString(3, booking.getEndTime());
            int rows = stmt.executeUpdate();
            log.info("Đã xóa cứng session dự phòng trên DB 2 cho ngày {} {}-{}: {} dòng",
                    booking.getBookingDate(), booking.getStartTime(), booking.getEndTime(), rows);
            return rows > 0;
        } catch (Exception e) {
            log.warn("Không thể xóa session dự phòng trên DB 2: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Đồng bộ đánh giá/chấm điểm từ LMS sang DB 2
     */
    public boolean syncEvaluationToExternalDb(com.ielts.lms.booking.entity.SupportBooking booking) {
        if (!isExternalDbConfigured() || booking == null || booking.getExternalSessionId() == null) {
            return false;
        }

        String sql = "UPDATE public.support_sessions SET " +
                     "status = 'COMPLETED'::support_sessions_status_enum, " +
                     "is_present = ?, " +
                     "score = ?, " +
                     "ta_comment = ?, " +
                     "absence_reason = ?, " +
                     "evaluated_at = NOW(), " +
                     "updated_at = NOW() " +
                     "WHERE id = ?::uuid";

        try (Connection conn = createConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            if (booking.getIsPresent() != null) {
                stmt.setBoolean(1, booking.getIsPresent());
            } else {
                stmt.setNull(1, java.sql.Types.BOOLEAN);
            }

            if (booking.getScore() != null) {
                stmt.setDouble(2, booking.getScore());
            } else {
                stmt.setNull(2, java.sql.Types.NUMERIC);
            }

            stmt.setString(3, booking.getTaComment());
            stmt.setString(4, booking.getAbsenceReason());
            stmt.setString(5, booking.getExternalSessionId());

            int rows = stmt.executeUpdate();
            log.info("Đã đồng bộ đánh giá/chấm điểm sang DB 2 cho session {}: {} dòng", booking.getExternalSessionId(), rows);
            return rows > 0;
        } catch (Exception e) {
            log.warn("Không thể đồng bộ đánh giá sang DB 2: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Kéo cập nhật điểm / đánh giá / điểm danh và trạng thái từ DB 2 về LMS.
     * Tự động phát hiện ca đã bị XÓA CỨNG hoặc HỦY trên DB 2 để cập nhật vào LMS.
     * Trả về true nếu có bất kỳ thay đổi nào để phía gọi có thể lưu lại vào MySQL.
     */
    public boolean pullExternalSessionUpdates(List<com.ielts.lms.booking.entity.SupportBooking> bookings) {
        if (!isExternalDbConfigured() || bookings == null || bookings.isEmpty()) {
            return false;
        }

        List<com.ielts.lms.booking.entity.SupportBooking> linkedBookings = bookings.stream()
                .filter(b -> b.getExternalSessionId() != null && !b.getExternalSessionId().trim().isEmpty())
                .toList();

        if (linkedBookings.isEmpty()) {
            return false;
        }

        boolean hasAnyChanges = false;

        try (Connection conn = createConnection()) {
            String sql = "SELECT id, status, is_present, score, ta_comment, absence_reason, evaluated_at " +
                         "FROM public.support_sessions WHERE id = ?::uuid";

            for (com.ielts.lms.booking.entity.SupportBooking b : linkedBookings) {
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, b.getExternalSessionId());
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) {
                            String extStatus = rs.getString("status");
                            if ("COMPLETED".equalsIgnoreCase(extStatus) && !"COMPLETED".equals(b.getStatus())) {
                                b.setStatus("COMPLETED");
                                hasAnyChanges = true;
                            } else if ("CANCELLED".equalsIgnoreCase(extStatus) && !"CANCELLED".equals(b.getStatus())) {
                                b.setStatus("CANCELLED");
                                hasAnyChanges = true;
                            }

                            boolean isPresent = rs.getBoolean("is_present");
                            if (!rs.wasNull() && !Objects.equals(b.getIsPresent(), isPresent)) {
                                b.setIsPresent(isPresent);
                                hasAnyChanges = true;
                            }

                            double score = rs.getDouble("score");
                            if (!rs.wasNull() && !Objects.equals(b.getScore(), score)) {
                                b.setScore(score);
                                hasAnyChanges = true;
                            }

                            String comment = rs.getString("ta_comment");
                            if (comment != null && !comment.equals(b.getTaComment())) {
                                b.setTaComment(comment);
                                hasAnyChanges = true;
                            }

                            String reason = rs.getString("absence_reason");
                            if (reason != null && !reason.equals(b.getAbsenceReason())) {
                                b.setAbsenceReason(reason);
                                hasAnyChanges = true;
                            }
                        } else {
                            // Không tìm thấy trên DB 2 -> Đã bị xóa trên DB 2!
                            if (!"CANCELLED".equals(b.getStatus())) {
                                b.setStatus("CANCELLED");
                                hasAnyChanges = true;
                                log.info("Session {} không còn trên DB 2 -> tự động đồng bộ CANCELLED vào LMS", b.getExternalSessionId());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Lỗi khi kéo cập nhật từ DB 2: {}", e.getMessage());
        }

        return hasAnyChanges;
    }
}
