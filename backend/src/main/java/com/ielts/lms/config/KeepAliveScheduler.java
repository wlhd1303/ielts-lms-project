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

        // 2. Tự Ping URL Public trên Render của Backend để Server không bị Sleep
        try {
            String url = "https://ielts-lms-project.onrender.com/api/classes";
            restTemplate.getForObject(url, String.class);
            System.out.println("Keep-Alive HTTP Ping: OK");
        } catch (Exception e) {
            // Dù dính lỗi 401 Unauthorized do không truyền JWT Token thì request vẫn đã chạm tới Render,
            // giúp giữ cho Web Service không bị rơi vào trạng thái ngủ đông (Idle).
            System.out.println("Keep-Alive HTTP Ping Sent (Render awakened).");
        }
    }
}