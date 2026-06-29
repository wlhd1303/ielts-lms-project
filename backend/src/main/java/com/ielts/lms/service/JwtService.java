package com.ielts.lms.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    // Đây là "Con dấu bí mật" để ký lên vé. Phải dài ít nhất 256-bit.
    // LƯU Ý: Trong thực tế đi làm, mã này phải được giấu kín, không bao giờ để lộ trong code!
    private static final String SECRET_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    // 1. Hàm tạo Vé vào cửa (Access Token) - Thời hạn 1 ngày
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username) // Tên người được cấp vé
                .setIssuedAt(new Date(System.currentTimeMillis())) // Ngày cấp
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24)) // Hết hạn sau 24 giờ
                .signWith(getSignInKey(), SignatureAlgorithm.HS256) // Đóng dấu bảo mật
                .compact();
    }

    // 2. Hàm đọc tên người dùng từ cái Vé (Để bảo vệ tra xét)
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // 3. Hàm kiểm tra xem Vé này là thật hay giả/hết hạn chưa
    public boolean isTokenValid(String token, String username) {
        final String tokenUsername = extractUsername(token);
        return (tokenUsername.equals(username)) && !isTokenExpired(token);
    }

    // --- CÁC HÀM TIỆN ÍCH BÊN DƯỚI ĐỂ HỖ TRỢ XỬ LÝ CHUYÊN SÂU ---
    
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}