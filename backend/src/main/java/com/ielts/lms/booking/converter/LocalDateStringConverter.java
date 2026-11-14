package com.ielts.lms.booking.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * JPA Converter lưu trữ và đọc LocalDate dưới dạng String thuần ('YYYY-MM-DD').
 * Giúp triệt tiêu hoàn toàn lỗi lệch ngày (-1 ngày) do lệch múi giờ giữa JVM (GMT+7)
 * và Cloud Database MySQL / TiDB (UTC).
 */
@Converter(autoApply = false)
public class LocalDateStringConverter implements AttributeConverter<LocalDate, String> {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public String convertToDatabaseColumn(LocalDate locDate) {
        return locDate == null ? null : locDate.format(FORMATTER);
    }

    @Override
    public LocalDate convertToEntityAttribute(String sqlDate) {
        if (sqlDate == null || sqlDate.isBlank()) {
            return null;
        }
        String trimmed = sqlDate.trim();
        if (trimmed.length() >= 10) {
            return LocalDate.parse(trimmed.substring(0, 10), FORMATTER);
        }
        return LocalDate.parse(trimmed, FORMATTER);
    }
}
