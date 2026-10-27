package com.ielts.lms.booking.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PdfProxyService {

    private static final Pattern DRIVE_FILE_PATTERN = Pattern.compile("/file/d/([a-zA-Z0-9_-]+)");
    private static final Pattern DRIVE_ID_PARAM_PATTERN = Pattern.compile("[?&]id=([a-zA-Z0-9_-]+)");

    /**
     * Chuẩn hóa URL PDF (đặc biệt giải quyết link Google Drive)
     */
    public String resolvePdfUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return null;
        }
        String clean = rawUrl.trim();

        // 1. Kiểm tra nếu là link Google Drive
        String driveFileId = extractGoogleDriveFileId(clean);
        if (driveFileId != null) {
            // Chuyển thành link export download trực tiếp kèm tham số confirm=t để vượt cảnh báo dung lượng
            return "https://drive.google.com/uc?export=download&confirm=t&id=" + driveFileId;
        }

        return clean;
    }

    /**
     * Trích xuất file ID từ link Google Drive
     */
    public String extractGoogleDriveFileId(String url) {
        if (!url.contains("drive.google.com") && !url.contains("docs.google.com")) {
            return null;
        }

        Matcher matcher1 = DRIVE_FILE_PATTERN.matcher(url);
        if (matcher1.find()) {
            return matcher1.group(1);
        }

        Matcher matcher2 = DRIVE_ID_PARAM_PATTERN.matcher(url);
        if (matcher2.find()) {
            return matcher2.group(1);
        }

        return null;
    }

    /**
     * Tải và stream nội dung PDF với đầy đủ headers chuẩn CORS và xử lý đa chuyển hướng (multi-redirect)
     */
    public ResponseEntity<Resource> proxyPdfStream(String targetUrl) {
        try {
            String resolvedUrl = resolvePdfUrl(targetUrl);
            if (resolvedUrl == null) {
                return ResponseEntity.badRequest().build();
            }

            String currentUrl = resolvedUrl;
            HttpURLConnection connection = null;
            int redirects = 0;
            String cookies = "";

            while (redirects < 5) {
                URL url = URI.create(currentUrl).toURL();
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IELTS-LMS-Platform/1.0");
                connection.setInstanceFollowRedirects(false); // Xử lý chuyển hướng thủ công để duy trì cookies
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                if (!cookies.isEmpty()) {
                    connection.setRequestProperty("Cookie", cookies);
                }

                int status = connection.getResponseCode();

                // Lưu cookies nếu server đích trả về Set-Cookie
                String headerCookies = connection.getHeaderField("Set-Cookie");
                if (headerCookies != null) {
                    String cookieVal = headerCookies.split(";")[0];
                    if (cookies.isEmpty()) {
                        cookies = cookieVal;
                    } else {
                        cookies += "; " + cookieVal;
                    }
                }

                // Xử lý chuyển hướng (301, 302, 303, 307, 308)
                if (status == HttpURLConnection.HTTP_MOVED_TEMP 
                        || status == HttpURLConnection.HTTP_MOVED_PERM 
                        || status == HttpURLConnection.HTTP_SEE_OTHER
                        || status == 307
                        || status == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    if (newUrl == null || newUrl.trim().isEmpty()) {
                        break;
                    }
                    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                        newUrl = URI.create(currentUrl).resolve(newUrl).toString();
                    }
                    currentUrl = newUrl;
                    redirects++;
                    connection.disconnect();
                } else {
                    break;
                }
            }

            if (connection == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }

            InputStream inputStream = connection.getInputStream();
            InputStreamResource resource = new InputStreamResource(inputStream);

            String remoteContentType = connection.getContentType();
            MediaType mediaType = MediaType.APPLICATION_PDF;
            if (remoteContentType != null && !remoteContentType.trim().isEmpty()) {
                try {
                    mediaType = MediaType.parseMediaType(remoteContentType.split(";")[0].trim());
                } catch (Exception e) {
                    mediaType = MediaType.APPLICATION_PDF;
                }
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(mediaType);
            headers.setContentDisposition(ContentDisposition.inline().filename("exam-material.pdf").build());
            headers.setCacheControl(CacheControl.maxAge(3600, java.util.concurrent.TimeUnit.SECONDS).cachePublic());

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);

        } catch (Exception e) {
            log.error("Lỗi khi proxy PDF từ URL {}: {}", targetUrl, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
