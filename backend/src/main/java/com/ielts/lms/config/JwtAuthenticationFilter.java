package com.ielts.lms.config;

import com.ielts.lms.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        String jwt = null;
        String username = null;

        // 1. Nếu không có vé, hoặc vé không có chữ "Bearer " ở đầu -> Bỏ qua, không cho vào
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 2. Cắt chữ "Bearer " (7 ký tự) để lấy phần mã Token lõi
            jwt = authHeader.substring(7);
            username = jwtService.extractUsername(jwt);

            // 3. Nếu có tên user và chưa đăng nhập trong phiên này
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                
                // Đưa vào máy quét xem vé thật hay giả/hết hạn chưa
                if (jwtService.isTokenValid(jwt, username)) {
                    
                    // Tạm thời tạo một hồ sơ ảo để báo cho Spring Security là "Khách VIP, cho qua!"
                    UserDetails userDetails = User.withUsername(username).password("").authorities("ROLE_USER").build();

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Đóng mộc cho phép đi qua cửa
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // BẮT LỖI TẠI ĐÂY: Nếu Token hết hạn (ExpiredJwtException) hoặc sai chữ ký, 
            // ta chỉ in ra log cảnh báo và để nó trôi qua, KHÔNG làm sập server!
            System.out.println("Cảnh báo Token không hợp lệ hoặc đã hết hạn: " + e.getMessage());
        }
        
        // Đi tiếp vào các API bên trong
        filterChain.doFilter(request, response);
    }
}