package com.ielts.lms.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@EnableScheduling
public class KeepAliveScheduler {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Value("${app.keep-alive.url:}")
    private String keepAliveUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Scheduled(fixedRate = 300000)
    public void keepAlive() {
        // 1. Kích hoạt truy vấn siêu nhẹ xuống Database để giữ Connection luôn ALIVE
        try {
            jdbcTemplate.execute("SELECT 1");
            System.out.println("Keep-Alive DB Ping: OK");
        } catch (Exception e) {
            System.err.println("Keep-Alive DB Ping Failed: " + e.getMessage());
        }

        // 2. Tự Ping URL Public của Backend nếu có cấu hình để Server không bị Sleep
        if (keepAliveUrl != null && !keepAliveUrl.trim().isEmpty()) {
            try {
                restTemplate.getForObject(keepAliveUrl.trim(), String.class);
                System.out.println("Keep-Alive HTTP Ping: OK");
            } catch (Exception e) {
                System.out.println("Keep-Alive HTTP Ping Sent (" + keepAliveUrl + ")");
            }
        }
    }
}