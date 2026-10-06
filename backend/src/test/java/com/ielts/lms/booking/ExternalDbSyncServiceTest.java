package com.ielts.lms.booking;

import com.ielts.lms.booking.entity.SupportBooking;
import com.ielts.lms.booking.service.ExternalDbSyncService;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class ExternalDbSyncServiceTest {

    private ExternalDbSyncService service;

    @BeforeEach
    void setUp() {
        service = new ExternalDbSyncService();
    }

    @Test
    @DisplayName("TC-SYNC-01: Kiểm tra cấu hình kết nối DB ngoài (rỗng/chưa cấu hình)")
    void testIsExternalDbConfigured_Empty() {
        ReflectionTestUtils.setField(service, "externalDbUrl", null);
        assertThat(service.isExternalDbConfigured()).isFalse();

        ReflectionTestUtils.setField(service, "externalDbUrl", "   ");
        assertThat(service.isExternalDbConfigured()).isFalse();
    }

    @Test
    @DisplayName("TC-SYNC-02: Kiểm tra cấu hình kết nối DB ngoài (hợp lệ)")
    void testIsExternalDbConfigured_Valid() {
        ReflectionTestUtils.setField(service, "externalDbUrl", "postgresql://user:pass@host:5432/db");
        assertThat(service.isExternalDbConfigured()).isTrue();
    }

    @Test
    @DisplayName("TC-SYNC-03: Khi DB ngoài chưa cấu hình, các hàm đọc/ghi trả về an toàn và không gây crash")
    void testUnconfiguredGracefulDegradation() {
        ReflectionTestUtils.setField(service, "externalDbUrl", "");

        assertThat(service.getTeachingAssistants()).isEmpty();
        assertThat(service.getBusySlotsForDate(LocalDate.now())).isEmpty();

        SupportBooking booking = new SupportBooking();
        booking.setId(1L);
        booking.setUser(new User());

        assertThat(service.syncSupportSessionToExternalDb(booking)).isNull();
        assertThatCode(() -> service.cancelExternalSupportSession("some-uuid")).doesNotThrowAnyException();
        assertThatCode(() -> service.syncEvaluationToExternalDb(booking)).doesNotThrowAnyException();
        assertThatCode(() -> service.pullExternalSessionUpdates(List.of(booking))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("TC-SYNC-04: Khả năng chịu lỗi (Fault Tolerance) khi máy chủ DB ngoài offline hoặc timeout")
    void testUnreachableHostFaultTolerance() {
        // Cấu hình trỏ tới IP loopback cổng đóng để giả lập kết nối thất bại
        ReflectionTestUtils.setField(service, "externalDbUrl", "postgresql://user:pass@127.0.0.1:1/nonexistent");

        // Các hàm vẫn phải bắt ngoại lệ an toàn, ghi log cảnh báo và không ném lỗi ra ngoài làm sập LMS
        assertThat(service.getTeachingAssistants()).isEmpty();
        assertThat(service.getBusySlotsForDate(LocalDate.now())).isEmpty();

        SupportBooking booking = new SupportBooking();
        booking.setId(99L);
        User u = new User();
        u.setUsername("testuser");
        booking.setUser(u);
        booking.setExternalSessionId("ext-uuid-123");

        assertThat(service.syncSupportSessionToExternalDb(booking)).isNull();
        assertThatCode(() -> service.cancelExternalSupportSession("ext-uuid-123")).doesNotThrowAnyException();
        assertThatCode(() -> service.syncEvaluationToExternalDb(booking)).doesNotThrowAnyException();
        assertThatCode(() -> service.pullExternalSessionUpdates(List.of(booking))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("TC-SYNC-05: An toàn khi truyền dữ liệu null hoặc rỗng vào các phương thức sync")
    void testNullAndEmptyArgumentSafety() {
        ReflectionTestUtils.setField(service, "externalDbUrl", "postgresql://user:pass@host:5432/db");

        assertThatCode(() -> service.cancelExternalSupportSession(null)).doesNotThrowAnyException();
        assertThatCode(() -> service.cancelExternalSupportSession("   ")).doesNotThrowAnyException();
        assertThatCode(() -> service.syncEvaluationToExternalDb(null)).doesNotThrowAnyException();
        assertThatCode(() -> service.pullExternalSessionUpdates(null)).doesNotThrowAnyException();
        assertThatCode(() -> service.pullExternalSessionUpdates(Collections.emptyList())).doesNotThrowAnyException();
    }
}
