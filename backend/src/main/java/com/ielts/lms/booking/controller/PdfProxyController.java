package com.ielts.lms.booking.controller;

import com.ielts.lms.booking.service.PdfProxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/booking/pdf-proxy")
@RequiredArgsConstructor
public class PdfProxyController {

    private final PdfProxyService pdfProxyService;

    /**
     * Proxy stream PDF để vượt rào cản CORS và hỗ trợ link Google Drive
     */
    @GetMapping
    public ResponseEntity<Resource> proxyPdf(@RequestParam("url") String url) {
        return pdfProxyService.proxyPdfStream(url);
    }
}
