package com.ielts.lms.booking;

import com.ielts.lms.booking.util.IeltsScoreCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IeltsScoreCalculatorTest {

    @Test
    @DisplayName("Quy đổi điểm Listening chuẩn IELTS")
    void testListeningBandConversion() {
        assertThat(IeltsScoreCalculator.calculateListeningBand(40)).isEqualTo(9.0);
        assertThat(IeltsScoreCalculator.calculateListeningBand(39)).isEqualTo(9.0);
        assertThat(IeltsScoreCalculator.calculateListeningBand(37)).isEqualTo(8.5);
        assertThat(IeltsScoreCalculator.calculateListeningBand(35)).isEqualTo(8.0);
        assertThat(IeltsScoreCalculator.calculateListeningBand(32)).isEqualTo(7.5);
        assertThat(IeltsScoreCalculator.calculateListeningBand(30)).isEqualTo(7.0);
        assertThat(IeltsScoreCalculator.calculateListeningBand(26)).isEqualTo(6.5);
        assertThat(IeltsScoreCalculator.calculateListeningBand(23)).isEqualTo(6.0);
        assertThat(IeltsScoreCalculator.calculateListeningBand(18)).isEqualTo(5.5);
        assertThat(IeltsScoreCalculator.calculateListeningBand(0)).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Quy đổi điểm Reading Academic chuẩn IELTS")
    void testReadingBandConversion() {
        assertThat(IeltsScoreCalculator.calculateReadingBand(40)).isEqualTo(9.0);
        assertThat(IeltsScoreCalculator.calculateReadingBand(39)).isEqualTo(9.0);
        assertThat(IeltsScoreCalculator.calculateReadingBand(37)).isEqualTo(8.5);
        assertThat(IeltsScoreCalculator.calculateReadingBand(35)).isEqualTo(8.0);
        assertThat(IeltsScoreCalculator.calculateReadingBand(33)).isEqualTo(7.5);
        assertThat(IeltsScoreCalculator.calculateReadingBand(30)).isEqualTo(7.0);
        assertThat(IeltsScoreCalculator.calculateReadingBand(27)).isEqualTo(6.5);
        assertThat(IeltsScoreCalculator.calculateReadingBand(23)).isEqualTo(6.0);
        assertThat(IeltsScoreCalculator.calculateReadingBand(19)).isEqualTo(5.5);
        assertThat(IeltsScoreCalculator.calculateReadingBand(0)).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Làm tròn điểm Overall theo chuẩn quốc tế IELTS")
    void testOverallRounding() {
        // .25 -> .5
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.25)).isEqualTo(6.5);
        // .125 -> .0
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.125)).isEqualTo(6.0);
        // .375 -> .5
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.375)).isEqualTo(6.5);
        // .625 -> .5
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.625)).isEqualTo(6.5);
        // .75 -> .0 (tiếp theo)
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.75)).isEqualTo(7.0);
        // .875 -> .0 (tiếp theo)
        assertThat(IeltsScoreCalculator.roundIeltsOverall(6.875)).isEqualTo(7.0);
    }
}
