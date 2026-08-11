package com.ielts.lms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // Thêm domain Render chuẩn từ Console của bạn vào đây
                .allowedOrigins(
                    "http://localhost:5173", 
                    "https://ielts-lms-project.onrender.com",
                    "https://ielts-lms-project-1.onrender.com"
                ) 
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}