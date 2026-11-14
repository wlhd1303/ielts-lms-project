package com.ielts.lms.booking;

import com.ielts.lms.booking.dto.BatchTaAvailabilityDto;
import com.ielts.lms.booking.dto.CopyWeekAvailabilityDto;
import com.ielts.lms.booking.dto.TaSlotRequestDto;
import com.ielts.lms.booking.entity.TaAvailability;
import com.ielts.lms.booking.repository.TaAvailabilityRepository;
import com.ielts.lms.booking.service.BookingService;
import com.ielts.lms.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class TaAvailabilityScheduleTest {

    @Test
    @DisplayName("TC-TA-01: seedKhanhWeeklySchedule tạo chính xác 37 ca cho Trợ giảng Khanh (T2, T4, T6, T7 mỗi ngày 8 ca; CN 5 ca; T3, T5 nghỉ)")
    void testSeedKhanhWeeklySchedule_Generates37Slots() {
        LocalDate monday = LocalDate.of(2026, 11, 16);

        List<TaAvailability> savedList = new ArrayList<>();

        TaAvailabilityRepository fakeRepo = (TaAvailabilityRepository) Proxy.newProxyInstance(
                TaAvailabilityRepository.class.getClassLoader(),
                new Class<?>[]{TaAvailabilityRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName())) {
                        TaAvailability ta = (TaAvailability) args[0];
                        savedList.add(ta);
                        return ta;
                    }
                    return null;
                }
        );

        BookingService service = new BookingService(null, null, fakeRepo);

        User admin = new User();
        admin.setId(1L);

        List<TaAvailability> result = service.seedKhanhWeeklySchedule(monday, admin);

        // 8 ca x 4 ngày (T2, T4, T6, T7) + 5 ca CN = 37 ca
        assertThat(result).hasSize(37);

        // T2 (16/11): 8 ca 17:30 đến 21:30
        List<TaAvailability> t2 = result.stream().filter(s -> s.getAvailableDate().equals(monday)).toList();
        assertThat(t2).hasSize(8);
        assertThat(t2.get(0).getStartTime()).isEqualTo("17:30");
        assertThat(t2.get(0).getEndTime()).isEqualTo("18:00");
        assertThat(t2.get(7).getStartTime()).isEqualTo("21:00");
        assertThat(t2.get(7).getEndTime()).isEqualTo("21:30");

        // T3 (17/11) & T5 (19/11): Khanh nghỉ (0 ca)
        assertThat(result.stream().noneMatch(s -> s.getAvailableDate().equals(monday.plusDays(1)))).isTrue();
        assertThat(result.stream().noneMatch(s -> s.getAvailableDate().equals(monday.plusDays(3)))).isTrue();

        // T4 (18/11), T6 (20/11), T7 (21/11): mỗi ngày 8 ca
        assertThat(result.stream().filter(s -> s.getAvailableDate().equals(monday.plusDays(2))).count()).isEqualTo(8);
        assertThat(result.stream().filter(s -> s.getAvailableDate().equals(monday.plusDays(4))).count()).isEqualTo(8);
        assertThat(result.stream().filter(s -> s.getAvailableDate().equals(monday.plusDays(5))).count()).isEqualTo(8);

        // CN (22/11): 5 ca 17:00 đến 19:30
        List<TaAvailability> cn = result.stream().filter(s -> s.getAvailableDate().equals(monday.plusDays(6))).toList();
        assertThat(cn).hasSize(5);
        assertThat(cn.get(0).getStartTime()).isEqualTo("17:00");
        assertThat(cn.get(0).getEndTime()).isEqualTo("17:30");
        assertThat(cn.get(4).getStartTime()).isEqualTo("19:00");
        assertThat(cn.get(4).getEndTime()).isEqualTo("19:30");
    }

    @Test
    @DisplayName("TC-TA-02: copyWeeklySchedule sao chép lịch sang tuần sau với độ lệch 7 ngày chuẩn xác")
    void testCopyWeeklySchedule_Success() {
        LocalDate fromMonday = LocalDate.of(2026, 11, 16);
        LocalDate toMonday = LocalDate.of(2026, 11, 23);

        TaAvailability src1 = TaAvailability.builder()
                .id(1L)
                .taId("khanh")
                .taName("Trợ giảng Khanh")
                .availableDate(fromMonday)
                .startTime("17:30")
                .endTime("18:00")
                .skill("ALL")
                .maxCapacity(1)
                .build();

        TaAvailability src2 = TaAvailability.builder()
                .id(2L)
                .taId("khanh")
                .taName("Trợ giảng Khanh")
                .availableDate(fromMonday.plusDays(6)) // CN
                .startTime("17:00")
                .endTime("17:30")
                .skill("ALL")
                .maxCapacity(1)
                .build();

        List<TaAvailability> saved = new ArrayList<>();

        TaAvailabilityRepository fakeRepo = (TaAvailabilityRepository) Proxy.newProxyInstance(
                TaAvailabilityRepository.class.getClassLoader(),
                new Class<?>[]{TaAvailabilityRepository.class},
                (proxy, method, args) -> {
                    if ("findByAvailableDateBetweenAndTaIdOrderByAvailableDateAscStartTimeAsc".equals(method.getName())) {
                        return List.of(src1, src2);
                    }
                    if ("findOverlappingSlots".equals(method.getName())) {
                        return Collections.emptyList();
                    }
                    if ("save".equals(method.getName())) {
                        TaAvailability ta = (TaAvailability) args[0];
                        saved.add(ta);
                        return ta;
                    }
                    return null;
                }
        );

        BookingService service = new BookingService(null, null, fakeRepo);

        CopyWeekAvailabilityDto dto = CopyWeekAvailabilityDto.builder()
                .taId("khanh")
                .fromWeekStartDate(fromMonday)
                .toWeekStartDate(toMonday)
                .build();

        List<TaAvailability> copied = service.copyWeeklySchedule(dto, new User());

        assertThat(copied).hasSize(2);
        assertThat(copied.get(0).getAvailableDate()).isEqualTo(toMonday);
        assertThat(copied.get(0).getStartTime()).isEqualTo("17:30");

        assertThat(copied.get(1).getAvailableDate()).isEqualTo(toMonday.plusDays(6));
        assertThat(copied.get(1).getStartTime()).isEqualTo("17:00");
    }

    @Test
    @DisplayName("TC-TA-03: saveWeeklySchedule gán đúng thứ trong tuần và trạng thái mặc định OPEN")
    void testSaveWeeklySchedule_BatchSlots() {
        LocalDate monday = LocalDate.of(2026, 11, 16);

        List<TaSlotRequestDto> slots = List.of(
                TaSlotRequestDto.builder()
                        .availableDate(monday)
                        .startTime("17:30")
                        .endTime("18:00")
                        .skill("SPEAKING")
                        .maxCapacity(1)
                        .note("Luyện Speaking 1-1")
                        .build()
        );

        BatchTaAvailabilityDto dto = BatchTaAvailabilityDto.builder()
                .taId("khanh")
                .taName("Trợ giảng Khanh")
                .weekStartDate(monday)
                .slots(slots)
                .build();

        List<TaAvailability> saved = new ArrayList<>();

        TaAvailabilityRepository fakeRepo = (TaAvailabilityRepository) Proxy.newProxyInstance(
                TaAvailabilityRepository.class.getClassLoader(),
                new Class<?>[]{TaAvailabilityRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName())) {
                        TaAvailability ta = (TaAvailability) args[0];
                        saved.add(ta);
                        return ta;
                    }
                    return null;
                }
        );

        BookingService service = new BookingService(null, null, fakeRepo);
        List<TaAvailability> res = service.saveWeeklySchedule(dto, new User());

        assertThat(res).hasSize(1);
        TaAvailability slot = res.get(0);
        assertThat(slot.getDayOfWeek()).isEqualTo(1); // Thứ Hai
        assertThat(slot.getStatus()).isEqualTo("OPEN");
        assertThat(slot.getSkill()).isEqualTo("SPEAKING");
        assertThat(slot.getMaxCapacity()).isEqualTo(1);
        assertThat(slot.getNote()).isEqualTo("Luyện Speaking 1-1");
    }
}
