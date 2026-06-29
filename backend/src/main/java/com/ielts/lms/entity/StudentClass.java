package com.ielts.lms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;

@Entity
@Table(name = "classes")
@Data
@NoArgsConstructor
public class StudentClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Tên lớp (Ví dụ: Lớp Nền tảng, Lớp Nâng cao)

    // Một lớp có nhiều học viên (One-to-Many)
    @OneToMany(mappedBy = "studentClass")
    @JsonIgnore
    @ToString.Exclude
    private List<User> users;
}