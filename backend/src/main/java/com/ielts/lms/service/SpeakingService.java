package com.ielts.lms.service;

import com.ielts.lms.entity.SpeakingLesson;
import com.ielts.lms.entity.StudyRecord;
import com.ielts.lms.entity.StudentClass;
import com.ielts.lms.entity.User;
import com.ielts.lms.repository.SpeakingLessonRepository;
import com.ielts.lms.repository.StudentClassRepository;
import com.ielts.lms.repository.StudyRecordRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SpeakingService {

    private final StudyRecordRepository studyRecordRepository;
    private final UserRepository userRepository;
    private final SpeakingLessonRepository speakingLessonRepository;
    private final StudentClassRepository studentClassRepository;
    private final StreakService streakService; // 👈 1. INJECT STREAK SERVICE

    private static final float PASS_MARK = 70.0f; // Điểm chuẩn để Pass

    public SpeakingService(StudyRecordRepository studyRecordRepository, 
                           UserRepository userRepository,
                           SpeakingLessonRepository speakingLessonRepository,
                           StudentClassRepository studentClassRepository,
                           StreakService streakService) { // 👈 2. BỔ SUNG VÀO CONSTRUCTOR
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.speakingLessonRepository = speakingLessonRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    // --- LOGIC CHẤM ĐIỂM (CÓ TÍNH TOÁN PASS/FAIL) ---
    public StudyRecord submitSpeakingScore(Long lessonId, Map<String, Float> payload, int duration) {
        float score = payload.getOrDefault("score", 0f);
        
        // 1. Logic chuẩn hóa: Backend quyết định Pass/Fail
        boolean isPassed = score >= PASS_MARK;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        StudyRecord record = new StudyRecord();
        record.setUser(user);
        record.setModuleType("SPEAKING"); 
        record.setRefId(lessonId);
        record.setScore(score);
        record.setDurationSeconds(duration);
        
        StudyRecord savedRecord = studyRecordRepository.save(record);

        // ⚡ 3. TỰ ĐỘNG CẬP NHẬT STREAK VÀ LOG LƯU VÀO CSDL
        streakService.updateStreakProgress(user, "SPEAKING", lessonId);

        return savedRecord;
    }

    // --- LOGIC CHO ADMIN (CRUD) ---
    public SpeakingLesson createLesson(Long classId, String title, String content) {
        StudentClass studentClass = studentClassRepository.findById(classId).orElseThrow();
        SpeakingLesson lesson = new SpeakingLesson();
        lesson.setTitle(title);
        lesson.setContent(content);
        lesson.setStudentClass(studentClass);
        return speakingLessonRepository.save(lesson);
    }

    public List<SpeakingLesson> getAllLessonsByClass(Long classId) {
        return speakingLessonRepository.findByStudentClassId(classId);
    }

    public void deleteLesson(Long lessonId) {
        speakingLessonRepository.deleteById(lessonId);
    }
}