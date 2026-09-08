package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "writing_prompts")
@Data
@NoArgsConstructor
public class WritingPrompt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vietnamese_sentence", columnDefinition = "TEXT", nullable = false)
    private String vietnameseSentence;

    @Column(nullable = false)
    private String keywords; 

    @Column(name = "english_answer", columnDefinition = "TEXT", nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String englishAnswer;

    // Đã chuyển quan hệ từ Class sang Topic
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    @JsonIgnore
    private WritingTopic topic;

    @JsonProperty("topicId")
    public Long getTopicId() {
        return topic != null ? topic.getId() : null;
    }
}