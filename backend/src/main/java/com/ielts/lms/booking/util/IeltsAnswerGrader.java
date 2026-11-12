package com.ielts.lms.booking.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ielts.lms.booking.entity.TestEventQuestion;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bộ chấm điểm đáp án IELTS chuẩn hóa & linh hoạt:
 * - Không phân biệt chữ hoa/thường (true == TRUE, false == FALSE, a == A).
 * - Khử khoảng trắng thừa, smart quotes (’ -> '), dấu gạch ngang Unicode (– -> -), dấu phẩy hàng nghìn (1,500 == 1500).
 * - Hỗ trợ % / percent / per cent; a.m. / am, p.m. / pm; từ nối gạch ngang (well-known == well known).
 * - Hỗ trợ nhiều đáp án thay thế cách nhau bởi '/', '|', ';' (vd: centre/center).
 * - Hỗ trợ phần tùy chọn trong ngoặc đơn/vuông (vd: "(the) (main) library", "bicycle(s)", "[a] book").
 * - Hỗ trợ viết tắt chuẩn IELTS: TRUE/T, FALSE/F, NOT GIVEN/NG, YES/Y, NO/N.
 * - Hỗ trợ câu hỏi / cụm câu chọn nhiều đáp án KHÔNG PHÂN BIỆT THỨ TỰ (vd: Câu 21-23 chọn A B C hoặc C B A hoặc B A C, chống gian lận trùng lặp A A A).
 */
public final class IeltsAnswerGrader {

    private static final Pattern BRACKET_PATTERN = Pattern.compile("\\(([^)]*)\\)|\\[([^\\]]*)\\]");
    private static final Pattern THOUSAND_COMMA_PATTERN = Pattern.compile("(?<=\\d),(?=\\d{3}(?!\\d))");
    private static final Pattern INTERNAL_HYPHEN_PATTERN = Pattern.compile("(?<=[a-z0-9])-(?=[a-z0-9])");
    private static final Pattern SHORT_OPTION_CODE_PATTERN = Pattern.compile("^[a-zA-Z]{1,3}|^[ivxIVX]{1,5}$");

    private IeltsAnswerGrader() {
    }

    public static class QuestionMeta {
        public final TestEventQuestion question;
        public final String key;
        public final String type;
        public final String groupId;

        public QuestionMeta(TestEventQuestion question, String key, String type, String groupId) {
            this.question = question;
            this.key = key;
            this.type = type;
            this.groupId = groupId;
        }
    }

    /**
     * Chấm toàn bộ danh sách câu hỏi của một kỹ năng hoặc cả đề thi (có xử lý nhóm câu không phân biệt thứ tự).
     * Key trả về là "SKILL_QUESTIONNUMBER" (in hoa).
     */
    public static Map<String, Boolean> evaluateAllQuestions(
            List<TestEventQuestion> questions,
            Map<String, String> studentAnswers,
            ObjectMapper objectMapper) {

        Map<String, Boolean> results = new HashMap<>();
        if (questions == null || questions.isEmpty()) {
            return results;
        }
        Map<String, String> safeAnswers = studentAnswers != null ? studentAnswers : Collections.emptyMap();

        // Parse metadata từng câu hỏi
        List<QuestionMeta> metas = new ArrayList<>(questions.size());
        for (TestEventQuestion q : questions) {
            String skill = q.getSkill() != null ? q.getSkill().toUpperCase(Locale.ROOT).trim() : "READING";
            String key = skill + "_" + q.getQuestionNumber();
            ParsedMeta pm = parseQuestionMeta(q.getQuestionText(), objectMapper);
            metas.add(new QuestionMeta(q, key, pm.type, pm.groupId));
        }

        // Gom các nhóm câu hỏi tường minh theo groupId (ví dụ "READING_21_23")
        Map<String, List<Integer>> explicitGroups = new LinkedHashMap<>();
        for (int i = 0; i < metas.size(); i++) {
            String gid = metas.get(i).groupId;
            if (gid != null && !gid.isEmpty()) {
                explicitGroups.computeIfAbsent(gid, k -> new ArrayList<>()).add(i);
            }
        }

        boolean[] graded = new boolean[metas.size()];

        // 1. Chấm các cụm câu có groupId rõ ràng (>= 2 câu)
        for (List<Integer> indices : explicitGroups.values()) {
            if (indices.size() >= 2) {
                gradePoolGroup(metas, indices, safeAnswers, results, graded);
            }
        }

        // 2. Tự động nhận diện cụm câu liên tiếp cùng đáp án dạng tập hợp (vd: Câu 21, 22, 23 đều lưu "A, B, C" hoặc "A/B/C")
        int i = 0;
        while (i < metas.size()) {
            if (graded[i]) {
                i++;
                continue;
            }
            QuestionMeta startMeta = metas.get(i);
            String rawKey = startMeta.question.getCorrectAnswer();
            List<String> autoPool = parsePoolTokensForAutoGroup(rawKey);
            if (autoPool.size() >= 2) {
                int j = i + 1;
                String startSkill = startMeta.question.getSkill();
                while (j < metas.size()
                        && !graded[j]
                        && Objects.equals(startSkill, metas.get(j).question.getSkill())
                        && metas.get(j).question.getQuestionNumber() == metas.get(j - 1).question.getQuestionNumber() + 1
                        && Objects.equals(
                                normalizeRawPoolSignature(rawKey),
                                normalizeRawPoolSignature(metas.get(j).question.getCorrectAnswer()))) {
                    j++;
                }
                int runLen = j - i;
                if (runLen == autoPool.size()) {
                    List<Integer> groupIndices = new ArrayList<>();
                    for (int k = i; k < j; k++) {
                        groupIndices.add(k);
                    }
                    gradePoolGroup(metas, groupIndices, safeAnswers, results, graded);
                    i = j;
                    continue;
                }
            }
            i++;
        }

        // 3. Chấm các câu độc lập còn lại
        for (int idx = 0; idx < metas.size(); idx++) {
            if (graded[idx]) {
                continue;
            }
            QuestionMeta meta = metas.get(idx);
            String studentAns = findStudentAnswer(meta.question, safeAnswers);
            boolean correct = isSingleQuestionCorrect(studentAns, meta.question.getCorrectAnswer(), meta.type);
            results.put(meta.key, correct);
            graded[idx] = true;
        }

        return results;
    }

    private static void gradePoolGroup(
            List<QuestionMeta> metas,
            List<Integer> indices,
            Map<String, String> studentAnswers,
            Map<String, Boolean> results,
            boolean[] graded) {

        // Tìm tập pool đáp án từ câu đầu tiên có correctAnswer không rỗng trong nhóm
        List<String> remainingPool = new ArrayList<>();
        String groupType = "MULTI_SELECT";
        for (int idx : indices) {
            String raw = metas.get(idx).question.getCorrectAnswer();
            if (raw != null && !raw.trim().isEmpty()) {
                remainingPool = parseUnorderedPoolTokens(raw, indices.size());
                groupType = metas.get(idx).type;
                break;
            }
        }

        for (int idx : indices) {
            QuestionMeta meta = metas.get(idx);
            String studentAns = findStudentAnswer(meta.question, studentAnswers);
            boolean matched = false;

            if (studentAns != null && !studentAns.trim().isEmpty() && !remainingPool.isEmpty()) {
                for (int p = 0; p < remainingPool.size(); p++) {
                    if (matchesSingleCandidate(studentAns, remainingPool.get(p), groupType)) {
                        remainingPool.remove(p);
                        matched = true;
                        break;
                    }
                }
            }
            results.put(meta.key, matched);
            graded[idx] = true;
        }
    }

    /**
     * So khớp 1 câu hỏi đơn lẻ (hỗ trợ cả đáp án đơn, đáp án thay thế '/', tùy chọn '()', và set nhiều chữ cái trong 1 ô vd "A B C" == "C B A").
     */
    public static boolean isSingleQuestionCorrect(String studentAns, String rawCorrectAnswer, String questionType) {
        if (studentAns == null || rawCorrectAnswer == null) {
            return false;
        }
        String trimmedStudent = studentAns.trim();
        String trimmedCorrect = rawCorrectAnswer.trim();
        if (trimmedStudent.isEmpty() || trimmedCorrect.isEmpty()) {
            return false;
        }

        boolean explicitMultiSelect = "MULTI_SELECT".equalsIgnoreCase(questionType);
        List<String> expectedSet = parseStandaloneSetTokens(trimmedCorrect, explicitMultiSelect);
        if (expectedSet.size() >= 2) {
            return matchesUnorderedSet(trimmedStudent, expectedSet, questionType);
        }

        // So khớp đáp án chuẩn hoặc các biến thể qua '/', '|', ';'
        String[] acceptableAnswers = splitAlternatives(trimmedCorrect);
        for (String alt : acceptableAnswers) {
            if (matchesSingleCandidate(trimmedStudent, alt, questionType)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Quá tải tương thích cho các chỗ gọi chỉ có 2 tham số.
     */
    public static boolean isAnswerCorrect(String studentAns, String rawCorrectAnswer) {
        return isSingleQuestionCorrect(studentAns, rawCorrectAnswer, "FILL_IN_BLANK");
    }

    /**
     * Kiểm tra một chuỗi học viên nhập có khớp với 1 biến thể đáp án chuẩn (có hỗ trợ ngoặc tùy chọn & viết tắt IELTS).
     */
    public static boolean matchesSingleCandidate(String studentAns, String candidateKey, String questionType) {
        String cleanStudent = normalizeText(studentAns);
        if (cleanStudent.isEmpty()) {
            return false;
        }

        List<String> keyVariants = expandOptionalBrackets(candidateKey);
        for (String rawVariant : keyVariants) {
            String cleanKey = normalizeText(rawVariant);
            if (cleanKey.isEmpty()) {
                continue;
            }

            if (equalsNormalized(cleanStudent, cleanKey)) {
                return true;
            }

            // Kiểm tra tương đương chuẩn IELTS: TRUE/T, FALSE/F, NOT GIVEN/NG, YES/Y, NO/N
            if (matchesIeltsBooleanOrNg(cleanStudent, cleanKey, questionType)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matchesUnorderedSet(String studentAns, List<String> expectedSet, String questionType) {
        List<String> studentTokens = parseStudentSetTokens(studentAns, expectedSet);
        if (studentTokens.size() != expectedSet.size()) {
            return false;
        }

        List<String> remaining = new ArrayList<>(expectedSet);
        for (String stTok : studentTokens) {
            boolean found = false;
            for (int i = 0; i < remaining.size(); i++) {
                if (matchesSingleCandidate(stTok, remaining.get(i), questionType)) {
                    remaining.remove(i);
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return remaining.isEmpty();
    }

    private static boolean equalsNormalized(String a, String b) {
        if (a.equalsIgnoreCase(b)) {
            return true;
        }
        // Chấp nhận gạch nối và dấu cách tương đương (well-known == well known, twenty-five == twenty five)
        String aNoHyphen = INTERNAL_HYPHEN_PATTERN.matcher(a).replaceAll(" ").replaceAll("\\s+", " ");
        String bNoHyphen = INTERNAL_HYPHEN_PATTERN.matcher(b).replaceAll(" ").replaceAll("\\s+", " ");
        return aNoHyphen.equalsIgnoreCase(bNoHyphen);
    }

    private static boolean matchesIeltsBooleanOrNg(String cleanStudent, String cleanKey, String questionType) {
        boolean isTfngType = "TFNG".equalsIgnoreCase(questionType);
        boolean isYnngType = "YNNG".equalsIgnoreCase(questionType);

        if ("true".equals(cleanKey) || (isTfngType && "t".equals(cleanKey))) {
            return "true".equals(cleanStudent) || "t".equals(cleanStudent);
        }
        if ("false".equals(cleanKey) || (isTfngType && "f".equals(cleanKey))) {
            return "false".equals(cleanStudent) || "f".equals(cleanStudent);
        }
        if ("not given".equals(cleanKey) || "notgiven".equals(cleanKey) || "ng".equals(cleanKey) || "n g".equals(cleanKey)) {
            return "not given".equals(cleanStudent) || "notgiven".equals(cleanStudent) || "ng".equals(cleanStudent) || "n g".equals(cleanStudent);
        }
        if ("yes".equals(cleanKey) || (isYnngType && "y".equals(cleanKey))) {
            return "yes".equals(cleanStudent) || "y".equals(cleanStudent);
        }
        if ("no".equals(cleanKey) || (isYnngType && "n".equals(cleanKey))) {
            return "no".equals(cleanStudent) || "n".equals(cleanStudent);
        }
        return false;
    }

    /**
     * Chuẩn hóa văn bản: smart quotes, dấu gạch ngang, dấu phẩy hàng nghìn, %, a.m./p.m., dấu câu 2 đầu, khoảng trắng.
     */
    public static String normalizeText(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw
                .replace('\u00A0', ' ')
                .replace('’', '\'')
                .replace('‘', '\'')
                .replace('`', '\'')
                .replace('´', '\'')
                .replace('“', '"')
                .replace('”', '"')
                .replace('–', '-')
                .replace('—', '-')
                .replace('−', '-')
                .trim()
                .toLowerCase(Locale.ROOT);

        if (s.isEmpty()) {
            return "";
        }

        // Bỏ dấu phẩy hàng nghìn: 1,500 -> 1500; 10,000 -> 10000
        s = THOUSAND_COMMA_PATTERN.matcher(s).replaceAll("");

        // Chuẩn hóa phần trăm: 50% / 50 per cent -> 50 percent
        s = s.replace("%", " percent");
        s = s.replaceAll("\\bper\\s+cent\\b", "percent");

        // Chuẩn hóa giờ viết tắt: a.m. -> am, p.m. -> pm
        s = s.replaceAll("\\ba\\.m\\.?", "am");
        s = s.replaceAll("\\bp\\.m\\.?", "pm");

        // Khử dấu câu thừa ở đầu và cuối (giữ chữ và số)
        s = s.replaceAll("^[^a-z0-9]+|[^a-z0-9]+$", "");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    /**
     * Sinh các biến thể tùy chọn từ ngoặc đơn hoặc ngoặc vuông, hỗ trợ tối đa 4 nhóm ngoặc.
     * Vd: "(the) (main) bank" -> ["the main bank", "the bank", "main bank", "bank"]
     *     "bicycle(s)" -> ["bicycles", "bicycle"]
     */
    private static List<String> expandOptionalBrackets(String text) {
        List<String> results = new ArrayList<>();
        expandBracketsRecursive(text.trim(), 0, results);
        return results;
    }

    private static void expandBracketsRecursive(String current, int depth, List<String> out) {
        Matcher m = BRACKET_PATTERN.matcher(current);
        if (!m.find() || depth >= 4) {
            String cleaned = current.replace("(", "").replace(")", "").replace("[", "").replace("]", "").trim();
            if (!cleaned.isEmpty()) {
                out.add(cleaned);
            }
            return;
        }

        String inner = m.group(1) != null ? m.group(1) : m.group(2);
        String withInner = current.substring(0, m.start()) + inner + current.substring(m.end());
        String withoutInner = current.substring(0, m.start()) + current.substring(m.end());

        expandBracketsRecursive(withInner, depth + 1, out);
        expandBracketsRecursive(withoutInner, depth + 1, out);
    }

    private static String[] splitAlternatives(String rawKey) {
        return rawKey.split("[/|;]");
    }

    /**
     * Tách tập hợp các đáp án cho câu hỏi độc lập dạng MULTI_SELECT hoặc danh sách mã chọn (A, B, C).
     */
    private static List<String> parseStandaloneSetTokens(String rawKey, boolean explicitMultiSelect) {
        String sanitized = THOUSAND_COMMA_PATTERN.matcher(rawKey.trim()).replaceAll("");

        if (explicitMultiSelect) {
            return splitFlexibleSetTokens(sanitized);
        }

        // Chỉ tự nhận dạng tập hợp nhiều đáp án khi các phần tử đều là mã chọn ngắn (vd "A, B, C", "A & B", "i, ii, iii")
        // Không tách nếu có '/' (vì '/' mang nghĩa OR) hoặc là cụm từ dài/ngày tháng ("January 15, 2024")
        if (sanitized.contains("/") || sanitized.contains("|")) {
            return Collections.emptyList();
        }
        if (sanitized.matches(".*[,&+].*")) {
            String[] parts = sanitized.split("[,&+;]+");
            if (parts.length >= 2) {
                List<String> tokens = new ArrayList<>();
                boolean allShortCodes = true;
                for (String p : parts) {
                    String t = p.trim();
                    if (t.isEmpty() || !SHORT_OPTION_CODE_PATTERN.matcher(t).matches()) {
                        allShortCodes = false;
                        break;
                    }
                    tokens.add(t);
                }
                if (allShortCodes) {
                    return tokens;
                }
            }
        }
        return Collections.emptyList();
    }

    /**
     * Nhận diện pool đáp án khi Admin nhập giống nhau cho N câu liên tiếp (vd: 21: "A, B, C", 22: "A, B, C", 23: "A, B, C").
     */
    private static List<String> parsePoolTokensForAutoGroup(String rawKey) {
        if (rawKey == null || rawKey.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String sanitized = THOUSAND_COMMA_PATTERN.matcher(rawKey.trim()).replaceAll("");

        // Trường hợp phân tách bằng ',', '&', '+'
        if (sanitized.matches(".*[,&+].*")) {
            String[] parts = sanitized.split("[,&+;]+");
            if (parts.length >= 2) {
                List<String> tokens = new ArrayList<>();
                for (String p : parts) {
                    String t = p.trim();
                    if (!t.isEmpty()) {
                        tokens.add(t);
                    }
                }
                return tokens.size() >= 2 ? tokens : Collections.emptyList();
            }
        }

        // Trường hợp giáo viên gõ "A/B/C" cho cả 3 câu liên tiếp -> chỉ gom khi toàn bộ là mã chữ cái/số La Mã ngắn
        if (sanitized.contains("/")) {
            String[] parts = sanitized.split("/");
            if (parts.length >= 2) {
                List<String> tokens = new ArrayList<>();
                boolean allShort = true;
                for (String p : parts) {
                    String t = p.trim();
                    if (t.isEmpty() || !SHORT_OPTION_CODE_PATTERN.matcher(t).matches()) {
                        allShort = false;
                        break;
                    }
                    tokens.add(t);
                }
                if (allShort) {
                    return tokens;
                }
            }
        }

        // Trường hợp gõ cách nhau bởi khoảng trắng toàn bộ là chữ cái đơn ("A B C")
        String[] wsParts = sanitized.split("\\s+");
        if (wsParts.length >= 2) {
            boolean allSingleLetters = true;
            List<String> tokens = new ArrayList<>();
            for (String p : wsParts) {
                if (!p.matches("^[A-Za-z]$")) {
                    allSingleLetters = false;
                    break;
                }
                tokens.add(p);
            }
            if (allSingleLetters) {
                return tokens;
            }
        }

        return Collections.emptyList();
    }

    /**
     * Tách pool đáp án cho một nhóm câu hỏi với kích thước nhóm đã biết.
     */
    private static List<String> parseUnorderedPoolTokens(String rawKey, int expectedGroupSize) {
        String sanitized = THOUSAND_COMMA_PATTERN.matcher(rawKey.trim()).replaceAll("");
        if (sanitized.matches(".*[,&+;].*")) {
            String[] parts = sanitized.split("[,&+;]+");
            List<String> out = new ArrayList<>();
            for (String p : parts) {
                if (!p.trim().isEmpty()) out.add(p.trim());
            }
            if (!out.isEmpty()) return out;
        }
        if (sanitized.contains("/") || sanitized.contains("|")) {
            String[] parts = sanitized.split("[/|]+");
            List<String> out = new ArrayList<>();
            for (String p : parts) {
                if (!p.trim().isEmpty()) out.add(p.trim());
            }
            if (!out.isEmpty()) return out;
        }
        String[] wsParts = sanitized.split("\\s+");
        if (wsParts.length == expectedGroupSize && expectedGroupSize >= 2) {
            return new ArrayList<>(Arrays.asList(wsParts));
        }
        if (sanitized.matches("^[A-Za-z]{" + expectedGroupSize + "}$") && expectedGroupSize >= 2) {
            List<String> chars = new ArrayList<>();
            for (int c = 0; c < sanitized.length(); c++) {
                chars.add(String.valueOf(sanitized.charAt(c)));
            }
            return chars;
        }
        return Collections.singletonList(sanitized);
    }

    private static List<String> splitFlexibleSetTokens(String text) {
        String sanitized = THOUSAND_COMMA_PATTERN.matcher(text.trim()).replaceAll("");
        if (sanitized.matches(".*[,&+;].*")) {
            String[] parts = sanitized.split("[,&+;\\s]+");
            List<String> out = new ArrayList<>();
            for (String p : parts) {
                if (!p.trim().isEmpty()) out.add(p.trim());
            }
            return out;
        }
        String[] wsParts = sanitized.split("[\\s-]+");
        if (wsParts.length >= 2) {
            List<String> out = new ArrayList<>();
            for (String p : wsParts) {
                if (!p.trim().isEmpty()) out.add(p.trim());
            }
            return out;
        }
        return Collections.singletonList(sanitized);
    }

    private static List<String> parseStudentSetTokens(String studentAns, List<String> expectedSet) {
        String clean = studentAns.trim();
        // Nếu đáp án chuẩn toàn chữ cái đơn (A, B, C) và học viên viết liền không cách (vd "cba", "BAC")
        boolean allSingleAlpha = expectedSet.stream().allMatch(s -> s.trim().matches("^[A-Za-z]$"));
        if (allSingleAlpha && clean.matches("^[A-Za-z]{" + expectedSet.size() + "}$")) {
            List<String> chars = new ArrayList<>();
            for (int i = 0; i < clean.length(); i++) {
                chars.add(String.valueOf(clean.charAt(i)));
            }
            return chars;
        }
        return splitFlexibleSetTokens(clean);
    }

    private static String normalizeRawPoolSignature(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    public static String findStudentAnswer(TestEventQuestion q, Map<String, String> studentAnswers) {
        if (studentAnswers == null || q == null) {
            return null;
        }
        String skill = q.getSkill() != null ? q.getSkill().toUpperCase(Locale.ROOT).trim() : "READING";
        int qNum = q.getQuestionNumber();
        String ans = studentAnswers.get(skill + "_" + qNum);
        if (ans == null) {
            ans = studentAnswers.get(String.valueOf(qNum));
        }
        return ans;
    }

    private static class ParsedMeta {
        final String type;
        final String groupId;

        ParsedMeta(String type, String groupId) {
            this.type = type;
            this.groupId = groupId;
        }
    }

    private static ParsedMeta parseQuestionMeta(String questionText, ObjectMapper objectMapper) {
        if (questionText == null || objectMapper == null) {
            return new ParsedMeta("FILL_IN_BLANK", "");
        }
        String trimmed = questionText.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                JsonNode node = objectMapper.readTree(trimmed);
                String type = node.hasNonNull("type") ? node.get("type").asText() : "FILL_IN_BLANK";
                String groupId = node.hasNonNull("groupId") ? node.get("groupId").asText() : "";
                return new ParsedMeta(type, groupId);
            } catch (Exception ignored) {
                // Fall back to default
            }
        }
        return new ParsedMeta("FILL_IN_BLANK", "");
    }
}
