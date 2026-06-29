package com.ielts.lms.service;

import com.ielts.lms.entity.RefreshToken;
import com.ielts.lms.repository.RefreshTokenRepository;
import com.ielts.lms.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    // 1. Tạo mới hoặc Cập nhật Thẻ VIP cho người dùng
    public RefreshToken createRefreshToken(Long userId) {
        // Kiểm tra xem User này đã có RefreshToken trong DB chưa
        RefreshToken refreshToken = refreshTokenRepository.findByUserId(userId)
                .orElse(new RefreshToken()); // Nếu chưa có thì mới tạo đối tượng mới

        // Nếu là thẻ mới tạo, ta gắn User vào
        if (refreshToken.getUser() == null) {
            refreshToken.setUser(userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy User")));
        }
        
        // Cập nhật lại Hạn sử dụng: 7 ngày kể từ lúc tạo/đăng nhập lại
        refreshToken.setExpiryDate(Instant.now().plusMillis(1000L * 60 * 60 * 24 * 7)); 
        
        // Cấp phát lại Mã thẻ mới
        refreshToken.setToken(UUID.randomUUID().toString()); 
        
        // Lưu xuống Database (Nếu có ID rồi nó sẽ UPDATE, chưa có ID nó sẽ INSERT)
        return refreshTokenRepository.save(refreshToken);
    }

    // 2. Tìm thẻ trong Database
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    // 3. Kiểm tra xem thẻ VIP đã quá hạn 7 ngày chưa
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token); // Xoá thẻ cũ đi
            throw new RuntimeException("Refresh token đã hết hạn. Vui lòng đăng nhập lại!");
        }
        return token; // Vẫn còn hạn thì trả về để xài tiếp
    }
}