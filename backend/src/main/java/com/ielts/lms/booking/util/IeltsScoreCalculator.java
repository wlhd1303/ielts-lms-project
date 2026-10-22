package com.ielts.lms.booking.util;

public final class IeltsScoreCalculator {

    private IeltsScoreCalculator() {
    }

    /**
     * Quy đổi số câu đúng Listening (trên 40 câu) sang IELTS Band Score
     */
    public static double calculateListeningBand(int correctCount) {
        if (correctCount >= 39) return 9.0;
        if (correctCount >= 37) return 8.5;
        if (correctCount >= 35) return 8.0;
        if (correctCount >= 32) return 7.5;
        if (correctCount >= 30) return 7.0;
        if (correctCount >= 26) return 6.5;
        if (correctCount >= 23) return 6.0;
        if (correctCount >= 18) return 5.5;
        if (correctCount >= 16) return 5.0;
        if (correctCount >= 13) return 4.5;
        if (correctCount >= 10) return 4.0;
        if (correctCount >= 8)  return 3.5;
        if (correctCount >= 6)  return 3.0;
        if (correctCount >= 4)  return 2.5;
        if (correctCount >= 1)  return 2.0;
        return 1.0;
    }

    /**
     * Quy đổi số câu đúng Reading Academic (trên 40 câu) sang IELTS Band Score
     */
    public static double calculateReadingBand(int correctCount) {
        if (correctCount >= 39) return 9.0;
        if (correctCount >= 37) return 8.5;
        if (correctCount >= 35) return 8.0;
        if (correctCount >= 33) return 7.5;
        if (correctCount >= 30) return 7.0;
        if (correctCount >= 27) return 6.5;
        if (correctCount >= 23) return 6.0;
        if (correctCount >= 19) return 5.5;
        if (correctCount >= 15) return 5.0;
        if (correctCount >= 13) return 4.5;
        if (correctCount >= 10) return 4.0;
        if (correctCount >= 8)  return 3.5;
        if (correctCount >= 6)  return 3.0;
        if (correctCount >= 4)  return 2.5;
        if (correctCount >= 1)  return 2.0;
        return 1.0;
    }

    /**
     * Quy tắc làm tròn điểm Overall chuẩn quốc tế của IELTS:
     * - Nếu phần thập phân < 0.25 -> làm tròn xuống .0 (vd 6.125 -> 6.0)
     * - Nếu phần thập phân >= 0.25 và < 0.75 -> làm tròn thành .5 (vd 6.25 -> 6.5, 6.625 -> 6.5)
     * - Nếu phần thập phân >= 0.75 -> làm tròn lên .0 (vd 6.75 -> 7.0)
     */
    public static double roundIeltsOverall(double rawAverage) {
        double floor = Math.floor(rawAverage);
        double decimal = rawAverage - floor;

        if (decimal < 0.25) {
            return floor;
        } else if (decimal < 0.75) {
            return floor + 0.5;
        } else {
            return floor + 1.0;
        }
    }
}
