package com.ielts.lms.service;

import com.ielts.lms.dto.StudyCycleRequest;
import com.ielts.lms.entity.*;
import com.ielts.lms.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudyCycleService {

    private final StudyCycleRepository studyCycleRepository;
    private final StudentClassRepository studentClassRepository;
    private final MockTestRepository mockTestRepository;
    private final VocabTopicRepository vocabTopicRepository;
    private final DictationTopicRepository dictationTopicRepository;
    private final DictationAudioRepository dictationAudioRepository;
    private final SpeakingTopicRepository speakingTopicRepository;
    private final WritingTopicRepository writingTopicRepository;

    public StudyCycleService(StudyCycleRepository studyCycleRepository,
                             StudentClassRepository studentClassRepository,
                             MockTestRepository mockTestRepository,
                             VocabTopicRepository vocabTopicRepository,
                             DictationTopicRepository dictationTopicRepository,
                             DictationAudioRepository dictationAudioRepository,
                             SpeakingTopicRepository speakingTopicRepository,
                             WritingTopicRepository writingTopicRepository) {
        this.studyCycleRepository = studyCycleRepository;
        this.studentClassRepository = studentClassRepository;
        this.mockTestRepository = mockTestRepository;
        this.vocabTopicRepository = vocabTopicRepository;
        this.dictationTopicRepository = dictationTopicRepository;
        this.dictationAudioRepository = dictationAudioRepository;
        this.speakingTopicRepository = speakingTopicRepository;
        this.writingTopicRepository = writingTopicRepository;
    }

    public List<StudyCycle> getCyclesByClass(Long classId) {
        return studyCycleRepository.findByStudentClassIdOrderByCycleOrderAsc(classId);
    }

    public List<StudyCycle> getActiveCyclesByClass(Long classId) {
        return studyCycleRepository.findByStudentClassIdAndIsActiveTrueOrderByCycleOrderAsc(classId);
    }

    public StudyCycle getCycleById(Long cycleId) {
        return studyCycleRepository.findById(cycleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Vòng học ID: " + cycleId));
    }

    @Transactional
    public StudyCycle createCycle(Long classId, StudyCycleRequest req) {
        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp ID: " + classId));

        StudyCycle cycle = new StudyCycle();
        cycle.setStudentClass(studentClass);

        applyRequestToEntity(cycle, req, classId);

        if (cycle.getCycleOrder() <= 0) {
            List<StudyCycle> existing = studyCycleRepository.findByStudentClassIdOrderByCycleOrderAsc(classId);
            cycle.setCycleOrder(existing.isEmpty() ? 1 : existing.get(existing.size() - 1).getCycleOrder() + 1);
        }

        return studyCycleRepository.save(cycle);
    }

    @Transactional
    public StudyCycle updateCycle(Long cycleId, StudyCycleRequest req) {
        StudyCycle cycle = getCycleById(cycleId);
        Long classId = cycle.getStudentClass().getId();

        applyRequestToEntity(cycle, req, classId);

        return studyCycleRepository.save(cycle);
    }

    @Transactional
    public void deleteCycle(Long cycleId) {
        studyCycleRepository.deleteById(cycleId);
    }

    private void applyRequestToEntity(StudyCycle cycle, StudyCycleRequest req, Long classId) {
        if (req.getCycleOrder() != null && req.getCycleOrder() > 0) {
            cycle.setCycleOrder(req.getCycleOrder());
        }

        // Gán Mock Test
        if (req.getMockTestId() != null) {
            MockTest mockTest = mockTestRepository.findById(req.getMockTestId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đề thi ID: " + req.getMockTestId()));
            cycle.setMockTest(mockTest);
            
            // Tự động nhận diện loại chu kỳ từ Mock Test nếu req chưa có
            if (req.getCycleType() == null || req.getCycleType().trim().isEmpty()) {
                cycle.setCycleType(mockTest.getType());
            } else {
                cycle.setCycleType(req.getCycleType().toUpperCase().trim());
            }
        } else {
            cycle.setMockTest(null);
            cycle.setCycleType(req.getCycleType() != null ? req.getCycleType().toUpperCase().trim() : "READING");
        }

        // Tên vòng
        if (req.getTitle() != null && !req.getTitle().trim().isEmpty()) {
            cycle.setTitle(req.getTitle().trim());
        } else if (cycle.getMockTest() != null) {
            cycle.setTitle("Vòng " + cycle.getCycleOrder() + ": " + cycle.getMockTest().getTitle() + " (" + cycle.getCycleType() + ")");
        } else {
            cycle.setTitle("Vòng " + cycle.getCycleOrder() + " (" + cycle.getCycleType() + ")");
        }

        // Gán Vocab Topic
        if (req.getVocabTopicId() != null) {
            VocabTopic vocab = vocabTopicRepository.findById(req.getVocabTopicId()).orElse(null);
            cycle.setVocabTopic(vocab);
        } else {
            cycle.setVocabTopic(null);
        }

        // Gán Dictation Audio (⚡ NẾU LÀ READING: TỰ ĐỘNG BỎ QUA DICTATION, SET NULL)
        if ("READING".equalsIgnoreCase(cycle.getCycleType())) {
            cycle.setDictationAudio(null);
        } else {
            if (req.getDictationAudioId() != null) {
                DictationAudio audio = dictationAudioRepository.findById(req.getDictationAudioId()).orElse(null);
                cycle.setDictationAudio(audio);
            } else {
                cycle.setDictationAudio(null);
            }
        }

        // Gán Speaking Topic
        if (req.getSpeakingTopicId() != null) {
            SpeakingTopic speaking = speakingTopicRepository.findById(req.getSpeakingTopicId()).orElse(null);
            cycle.setSpeakingTopic(speaking);
        } else {
            cycle.setSpeakingTopic(null);
        }

        // Gán Writing Topic
        if (req.getWritingTopicId() != null) {
            WritingTopic writing = writingTopicRepository.findById(req.getWritingTopicId()).orElse(null);
            cycle.setWritingTopic(writing);
        } else {
            cycle.setWritingTopic(null);
        }

        if (req.getIsActive() != null) {
            cycle.setActive(req.getIsActive());
        }
    }

    // ⚡ TÍNH NĂNG TỰ ĐỘNG SINH CÁC VÒNG TỪ DỮ LIỆU HIỆN CÓ CỦA LỚP
    @Transactional
    public List<StudyCycle> autoGenerateCyclesForClass(Long classId) {
        StudentClass studentClass = studentClassRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp ID: " + classId));

        // Lấy tất cả mock test của lớp
        List<MockTest> mockTests = mockTestRepository.findByStudentClassId(classId);
        if (mockTests == null || mockTests.isEmpty()) {
            throw new RuntimeException("Lớp này chưa có đề Mock Test nào để tạo vòng!");
        }

        // Lấy kho dữ liệu hỗ trợ
        List<VocabTopic> vocabTopics = vocabTopicRepository.findByStudentClassId(classId);
        List<DictationTopic> dictationTopics = dictationTopicRepository.findByStudentClassId(classId);
        List<DictationAudio> allDictationAudios = new ArrayList<>();
        if (dictationTopics != null && !dictationTopics.isEmpty()) {
            List<Long> topicIds = dictationTopics.stream().map(DictationTopic::getId).toList();
            allDictationAudios = dictationAudioRepository.findByTopicIdIn(topicIds);
        }
        List<SpeakingTopic> speakingTopics = speakingTopicRepository.findByStudentClassId(classId);
        List<WritingTopic> writingTopics = writingTopicRepository.findByStudentClassId(classId);

        // Phân loại Reading và Listening tests
        List<MockTest> readingTests = mockTests.stream()
                .filter(t -> "READING".equalsIgnoreCase(t.getType()))
                .sorted(Comparator.comparing(MockTest::getId))
                .collect(Collectors.toList());

        List<MockTest> listeningTests = mockTests.stream()
                .filter(t -> "LISTENING".equalsIgnoreCase(t.getType()))
                .sorted(Comparator.comparing(MockTest::getId))
                .collect(Collectors.toList());

        // Tạo chuỗi xen kẽ: Bắt đầu bằng loại của bài đầu tiên có trong lớp
        List<MockTest> orderedTests = new ArrayList<>();
        int maxLen = Math.max(readingTests.size(), listeningTests.size());
        
        // Nếu có cả 2 loại, xen kẽ: Reading -> Listening -> Reading -> Listening...
        int rIdx = 0, lIdx = 0;
        boolean nextIsReading = !readingTests.isEmpty();

        while (rIdx < readingTests.size() || lIdx < listeningTests.size()) {
            if (nextIsReading && rIdx < readingTests.size()) {
                orderedTests.add(readingTests.get(rIdx++));
                if (lIdx < listeningTests.size()) nextIsReading = false;
            } else if (lIdx < listeningTests.size()) {
                orderedTests.add(listeningTests.get(lIdx++));
                if (rIdx < readingTests.size()) nextIsReading = true;
            } else if (rIdx < readingTests.size()) {
                orderedTests.add(readingTests.get(rIdx++));
            }
        }

        // Xóa các vòng cũ chưa dùng nếu Thầy bấm sinh lại
        studyCycleRepository.deleteByStudentClassId(classId);

        List<StudyCycle> createdCycles = new ArrayList<>();
        int order = 1;
        int vIdx = 0, dIdx = 0, sIdx = 0, wIdx = 0;

        for (MockTest test : orderedTests) {
            StudyCycle cycle = new StudyCycle();
            cycle.setStudentClass(studentClass);
            cycle.setCycleOrder(order);
            cycle.setCycleType(test.getType().toUpperCase());
            cycle.setTitle("Vòng " + order + ": " + test.getTitle() + " (" + test.getType() + ")");
            cycle.setMockTest(test);

            // Gán Vocab nếu có
            if (vocabTopics != null && !vocabTopics.isEmpty()) {
                cycle.setVocabTopic(vocabTopics.get(vIdx % vocabTopics.size()));
                vIdx++;
            }

            // Gán Dictation: CHỈ GÁN NẾU LÀ LISTENING
            if ("LISTENING".equalsIgnoreCase(test.getType()) && !allDictationAudios.isEmpty()) {
                cycle.setDictationAudio(allDictationAudios.get(dIdx % allDictationAudios.size()));
                dIdx++;
            } else {
                cycle.setDictationAudio(null); // READING: Skip dictation!
            }

            // Gán Speaking nếu có
            if (speakingTopics != null && !speakingTopics.isEmpty()) {
                cycle.setSpeakingTopic(speakingTopics.get(sIdx % speakingTopics.size()));
                sIdx++;
            }

            // Gán Writing nếu có
            if (writingTopics != null && !writingTopics.isEmpty()) {
                cycle.setWritingTopic(writingTopics.get(wIdx % writingTopics.size()));
                wIdx++;
            }

            cycle.setActive(true);
            createdCycles.add(cycle);
            order++;
        }

        return studyCycleRepository.saveAll(createdCycles);
    }
}
