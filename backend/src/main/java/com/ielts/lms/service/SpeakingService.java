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
    private final StreakService streakService;

    // ⚡ ĐÃ HẠ ĐIỂM CHUẨN PASS XUỐNG 60.0% ĐỂ LINH HOẠT HƠN CHO HỌC VIÊN
    private static final float PASS_MARK = 60.0f;

    public SpeakingService(StudyRecordRepository studyRecordRepository, 
                           UserRepository userRepository,
                           SpeakingLessonRepository speakingLessonRepository,
                           StudentClassRepository studentClassRepository,
                           StreakService streakService) {
        this.studyRecordRepository = studyRecordRepository;
        this.userRepository = userRepository;
        this.speakingLessonRepository = speakingLessonRepository;
        this.studentClassRepository = studentClassRepository;
        this.streakService = streakService;
    }

    // --- LOGIC CHẤM ĐIỂM ---
    public StudyRecord submitSpeakingScore(Long lessonId, Map<String, Float> payload, int duration) {
        float score = payload.getOrDefault("score", 0f);
        
        // Quyết định Pass/Fail theo mốc 60%
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

        // Tự động cập nhật chuỗi ngày học Streak
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