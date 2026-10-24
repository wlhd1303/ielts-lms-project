package com.ielts.lms;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class LmsApplication {

	@PostConstruct
	public void init() {
		// Thiết lập toàn bộ hệ thống chạy theo múi giờ chuẩn Việt Nam (GMT+7)
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
	}

	public static void main(String[] args) {
		SpringApplication.run(LmsApplication.class, args);
	}

}
