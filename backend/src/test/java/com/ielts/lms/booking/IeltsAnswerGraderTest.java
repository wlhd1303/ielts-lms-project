package com.ielts.lms.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.dto.ExamSubmissionResultDto;
import com.ielts.lms.booking.entity.TestEventQuestion;
import com.ielts.lms.booking.util.IeltsAnswerGrader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class IeltsAnswerGraderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("1. Chấm chuẩn xác không phân biệt hoa/thường & viết tắt IELTS (TRUE/FALSE/NOT GIVEN/YES/NO)")
    void testCaseInsensitiveAndIeltsShorthands() {
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("true", "TRUE"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("TRUE", "true"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("  False ", "FALSE"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("false", "FALSE"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("not given", "NOT GIVEN"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("NG", "NOT GIVEN"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("t", "TRUE"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("F", "FALSE"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("yes", "YES"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("y", "YES"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("no", "NO"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("N", "NO"));

        // Đảm bảo đáp án sai vẫn là sai
        assertFalse(IeltsAnswerGrader.isAnswerCorrect("true", "FALSE"));
        assertFalse(IeltsAnswerGrader.isAnswerCorrect("false", "TRUE"));
        assertFalse(IeltsAnswerGrader.isAnswerCorrect("no", "NOT GIVEN"));
    }

    @Test
    @DisplayName("2. Hỗ trợ chuẩn hóa số, %, a.m./p.m., ngoặc tùy chọn, biến thể '/' và smart quotes")
    void testFlexibleAnswerFormats() {
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("center", "centre/center"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("centre", "centre/center"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("bank", "(the) bank"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("the bank", "(the) bank"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("bicycles", "bicycle(s)"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("bicycle", "bicycle(s)"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("main library", "(the) (main) library"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("library", "(the) (main) library"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("1500", "1,500"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("1,500", "1500"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("50 percent", "50%"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("50 per cent", "50%"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("50%", "50 percent"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("9.30 am", "9.30 a.m."));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("well known", "well-known"));
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("children’s book", "children's book"));

        // Không đảo lộn cụm từ/ngày tháng có dấu phẩy
        assertTrue(IeltsAnswerGrader.isAnswerCorrect("January 15, 2024", "January 15, 2024"));
        assertFalse(IeltsAnswerGrader.isAnswerCorrect("2024, January 15", "January 15, 2024"));
    }

    @Test
    @DisplayName("3. Câu hỏi đơn lẻ dạng chọn nhiều chữ cái không phân biệt thứ tự (A B C == C B A == B A C)")
    void testSingleQuestionUnorderedSet() {
        assertTrue(IeltsAnswerGrader.isSingleQuestionCorrect("A, B, C", "A, B, C", "MULTI_SELECT"));
        assertTrue(IeltsAnswerGrader.isSingleQuestionCorrect("C B A", "A, B, C", "MULTI_SELECT"));
        assertTrue(IeltsAnswerGrader.isSingleQuestionCorrect("b, a, c", "A, B, C", "MULTI_SELECT"));
        assertTrue(IeltsAnswerGrader.isSingleQuestionCorrect("BAC", "A, B, C", "MULTI_SELECT"));
        assertTrue(IeltsAnswerGrader.isSingleQuestionCorrect("c-b-a", "A, B, C", "FILL_IN_BLANK"));

        assertFalse(IeltsAnswerGrader.isSingleQuestionCorrect("A, A, A", "A, B, C", "MULTI_SELECT"));
        assertFalse(IeltsAnswerGrader.isSingleQuestionCorrect("A, B, D", "A, B, C", "MULTI_SELECT"));
        assertFalse(IeltsAnswerGrader.isSingleQuestionCorrect("A, B", "A, B, C", "MULTI_SELECT"));
    }

    @Test
    @DisplayName("4. Nhóm 3 câu liên tiếp (21-23) chọn đáp án bất kỳ thứ tự (có groupId & tự động nhận diện) và chống trùng lặp")
    void testGroupedQuestionsAnyOrderAndAntiDuplicate() {
        List<TestEventQuestion> questions = new ArrayList<>();
        String jsonMeta = "{\"prompt\":\"Choose THREE letters\",\"type\":\"MULTI_SELECT\",\"groupId\":\"READING_21_23\",\"groupStart\":21,\"groupEnd\":23}";
        for (int num = 21; num <= 23; num++) {
            TestEventQuestion q = new TestEventQuestion();
            q.setSkill("READING");
            q.setQuestionNumber(num);
            q.setQuestionText(jsonMeta);
            q.setCorrectAnswer("A, B, C");
            questions.add(q);
        }

        // Trường hợp 1: Đảo thứ tự C, B, A -> Đúng cả 3
        Map<String, String> ansCBA = Map.of("READING_21", "c", "READING_22", "B", "READING_23", "a");
        Map<String, Boolean> resCBA = IeltsAnswerGrader.evaluateAllQuestions(questions, ansCBA, objectMapper);
        assertTrue(resCBA.get("READING_21"));
        assertTrue(resCBA.get("READING_22"));
        assertTrue(resCBA.get("READING_23"));

        // Trường hợp 2: Đảo thứ tự B, A, C -> Đúng cả 3
        Map<String, String> ansBAC = Map.of("READING_21", "B", "READING_22", "A", "READING_23", "C");
        Map<String, Boolean> resBAC = IeltsAnswerGrader.evaluateAllQuestions(questions, ansBAC, objectMapper);
        assertTrue(resBAC.get("READING_21"));
        assertTrue(resBAC.get("READING_22"));
        assertTrue(resBAC.get("READING_23"));

        // Trường hợp 3: Gian lận lặp lại A, A, A -> Chỉ câu đầu đúng (1/3), 2 câu sau SAI
        Map<String, String> ansDup = Map.of("READING_21", "A", "READING_22", "A", "READING_23", "A");
        Map<String, Boolean> resDup = IeltsAnswerGrader.evaluateAllQuestions(questions, ansDup, objectMapper);
        assertTrue(resDup.get("READING_21"));
        assertFalse(resDup.get("READING_22"));
        assertFalse(resDup.get("READING_23"));

        // Trường hợp 4: Đúng 2/3 (C, D, A) -> Q21 đúng, Q22 sai, Q23 đúng
        Map<String, String> ansPartial = Map.of("READING_21", "C", "READING_22", "D", "READING_23", "A");
        Map<String, Boolean> resPartial = IeltsAnswerGrader.evaluateAllQuestions(questions, ansPartial, objectMapper);
        assertTrue(resPartial.get("READING_21"));
        assertFalse(resPartial.get("READING_22"));
        assertTrue(resPartial.get("READING_23"));

        // Trường hợp 5: Không có groupId nhưng 3 câu liên tiếp cùng đáp án "A/B/C" -> Vẫn tự động nhận diện nhóm
        List<TestEventQuestion> legacyQuestions = new ArrayList<>();
        for (int num = 21; num <= 23; num++) {
            TestEventQuestion q = new TestEventQuestion();
            q.setSkill("READING");
            q.setQuestionNumber(num);
            q.setQuestionText("Choose 3 letters");
            q.setCorrectAnswer("A/B/C");
            legacyQuestions.add(q);
        }
        Map<String, Boolean> resLegacy = IeltsAnswerGrader.evaluateAllQuestions(legacyQuestions, ansCBA, objectMapper);
        assertTrue(resLegacy.get("READING_21"));
        assertTrue(resLegacy.get("READING_22"));
        assertTrue(resLegacy.get("READING_23"));
        Map<String, Boolean> resLegacyDup = IeltsAnswerGrader.evaluateAllQuestions(legacyQuestions, ansDup, objectMapper);
        assertTrue(resLegacyDup.get("READING_21"));
        assertFalse(resLegacyDup.get("READING_22"));
        assertFalse(resLegacyDup.get("READING_23"));
    }

    @Test
    @DisplayName("5. Kiểm tra JSON serialization của ExamSubmissionResultDto giữ nguyên key 'isCorrect'")
    void testDtoJsonHasIsCorrectKey() throws Exception {
        ExamSubmissionResultDto.QuestionReviewDetailDto item = ExamSubmissionResultDto.QuestionReviewDetailDto.builder()
                .skill("READING")
                .questionNumber(10)
                .studentAnswer("false")
                .correctAnswer("FALSE")
                .isCorrect(true)
                .build();

        String json = objectMapper.writeValueAsString(item);
        assertTrue(json.contains("\"isCorrect\":true"), "JSON phải chứa chính xác key \"isCorrect\":true nhưng nhận được: " + json);
    }
}
