package com.ielts.lms.controller;

import com.ielts.lms.entity.*;
import com.ielts.lms.service.DictationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dictation")
public class DictationController {

    private final DictationService dictationService;

    public DictationController(DictationService dictationService) {
        this.dictationService = dictationService;
    }

    // API CHO HỌC VIÊN
    @GetMapping("/class/{classId}/topics")
    public List<DictationTopic> getTopicsByClass(@PathVariable Long classId) { return dictationService.getTopicsByClass(classId); }

    @GetMapping("/topics/{topicId}/audios")
    public List<DictationAudio> getAudiosByTopic(@PathVariable Long topicId) { return dictationService.getAudiosByTopic(topicId); }

    @GetMapping("/audios/{audioId}/questions")
    public List<DictationQuestion> getQuestionsByAudio(@PathVariable Long audioId) { return dictationService.getQuestionsByAudio(audioId); }

    @PostMapping("/{audioId}/submit")
    public StudyRecord submitDictation(@PathVariable Long audioId, @RequestBody Map<Long, String> payload, @RequestParam int duration) {
        return dictationService.gradeDictation(audioId, payload, duration);
    }

    // API CHO ADMIN (CRUD)
    @PostMapping("/class/{classId}/topics")
    public DictationTopic createTopic(@PathVariable Long classId, @RequestBody DictationTopic topic) { return dictationService.createTopic(classId, topic); }

    @DeleteMapping("/topics/{topicId}")
    public void deleteTopic(@PathVariable Long topicId) { dictationService.deleteTopic(topicId); }

    @PostMapping("/topics/{topicId}/audios")
    public DictationAudio createAudio(@PathVariable Long topicId, @RequestBody DictationAudio audio) { return dictationService.createAudio(topicId, audio); }

    @DeleteMapping("/audios/{audioId}")
    public void deleteAudio(@PathVariable Long audioId) { dictationService.deleteAudio(audioId); }

    @PostMapping("/audios/{audioId}/questions")
    public DictationQuestion createQuestion(@PathVariable Long audioId, @RequestBody DictationQuestion q) { return dictationService.createQuestion(audioId, q); }

    @DeleteMapping("/questions/{questionId}")
    public void deleteQuestion(@PathVariable Long questionId) { dictationService.deleteQuestion(questionId); }
}