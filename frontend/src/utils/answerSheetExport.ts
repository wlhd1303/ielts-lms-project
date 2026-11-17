import type { ExamSubmissionResult } from '../services/bookingService';

/**
 * Định dạng ngày giờ chuẩn tiếng Việt
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Thoát chuỗi an toàn cho CSV
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 1. XUẤT PHIẾU ĐÁP ÁN & BÀI LÀM RA PDF (Giao diện in ấn A4 chuẩn chỉnh)
 */
export function exportAnswerSheetPdf(result: ExamSubmissionResult): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đã chặn cửa sổ in (pop-up). Vui lòng cho phép pop-up để tải phiếu PDF!');
    return;
  }

  const reviewList = result.reviewDetails || [];
  const correctCount = reviewList.filter((q) => Boolean(q.isCorrect ?? (q as any).correct)).length;
  const unansweredCount = reviewList.filter((q) => !q.studentAnswer || q.studentAnswer.trim() === '').length;
  const wrongCount = reviewList.length - correctCount - unansweredCount;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu Đáp Án - ${result.studentName || 'Thí sinh'} - ${result.eventTitle || 'Kỳ thi IELTS'}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .no-print {
      margin-bottom: 20px;
      padding: 12px 18px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: #e2e8f0;
      color: #334155;
      margin-left: 8px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      tr { page-break-inside: avoid; }
    }
    .header-box {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-title h1 {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .header-title p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      font-weight: 600;
    }
    .exam-tag {
      font-size: 11px;
      font-weight: 800;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 2fr 1.2fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
    }
    .info-value {
      color: #0f172a;
      font-weight: 700;
    }
    .score-banner {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .score-badge {
      flex: 1;
      padding: 10px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid transparent;
    }
    .score-badge.overall {
      background: #0f172a;
      color: #ffffff;
      border-color: #1e293b;
    }
    .score-badge.reading {
      background: #eff6ff;
      color: #1e40af;
      border-color: #bfdbfe;
    }
    .score-badge.listening {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }
    .score-num {
      font-size: 24px;
      font-weight: 900;
      line-height: 1.1;
      margin: 2px 0;
    }
    .score-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stats-bar {
      display: flex;
      gap: 12px;
      background: #f1f5f9;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 16px;
      align-items: center;
    }
    .badge-correct { color: #15803d; }
    .badge-wrong { color: #b91c1c; }
    .badge-blank { color: #64748b; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      padding: 7px 10px;
      text-align: left;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
    }
    tr.correct {
      background: #f0fdf4;
    }
    tr.wrong {
      background: #fef2f2;
    }
    tr.blank {
      background: #f8fafc;
    }
    .ans-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      font-size: 11px;
    }
    .text-correct {
      color: #15803d;
      font-weight: 800;
    }
    .text-wrong {
      color: #b91c1c;
      font-weight: 800;
    }
    .feedback-box {
      margin-top: 14px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 11px;
      color: #78350f;
    }
    .footer-note {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong style="color: #0f172a;">Phiếu Đối Chiếu Kết Quả Bài Làm</strong>
      <span style="color: #64748b; font-size: 12px; margin-left: 8px;">(Nhấn nút In bên phải hoặc Ctrl + P để lưu thành file PDF)</span>
    </div>
    <div>
      <button class="btn btn-print" onclick="window.print()">🖨️ In / Lưu PDF</button>
      <button class="btn btn-close" onclick="window.close()">Đóng</button>
    </div>
  </div>

  <div class="header-box">
    <div class="header-title">
      <h1>IELTS TEST REPORT & ANSWER SHEET</h1>
      <p>Hệ Thống Luyện Thi & Thi Thử Trực Tuyến LMS IELTS</p>
    </div>
    <div class="exam-tag">
      ${result.examFormat || 'ONLINE'} EXAM
    </div>
  </div>

  <div class="info-grid">
    <div class="card">
      <div class="card-title">Thông Tin Thí Sinh & Kỳ Thi</div>
      <div class="info-row">
        <span class="info-label">Họ và tên thí sinh:</span>
        <span class="info-value">${result.studentName || 'Thí sinh'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tên kỳ thi:</span>
        <span class="info-value">${result.eventTitle || 'Kỳ thi thử IELTS'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ca thi:</span>
        <span class="info-value">${result.shiftName || 'Mặc định'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mã đăng ký (Reg ID):</span>
        <span class="info-value">#${result.registrationId}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Thời Gian & Kỹ Năng</div>
      <div class="info-row">
        <span class="info-label">Kỹ năng thi:</span>
        <span class="info-value">${result.skillType || 'READING & LISTENING'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Thời điểm nộp bài:</span>
        <span class="info-value">${formatDateTime(result.submittedAt)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tổng số câu hỏi:</span>
        <span class="info-value">${reviewList.length} câu</span>
      </div>
    </div>
  </div>

  <div class="score-banner">
    ${result.overallScore !== null && result.overallScore !== undefined ? `
      <div class="score-badge overall">
        <div class="score-label" style="color: #fbbf24;">Overall Band Score</div>
        <div class="score-num" style="color: #ffffff;">${result.overallScore.toFixed(1)}</div>
        <div style="font-size: 10px; color: #94a3b8;">Quy đổi chuẩn Quốc tế</div>
      </div>
    ` : ''}

    ${result.scoreReading !== null && result.scoreReading !== undefined ? `
      <div class="score-badge reading">
        <div class="score-label">Reading Band</div>
        <div class="score-num">${result.scoreReading.toFixed(1)}</div>
        <div style="font-size: 10px; font-weight: 700;">Đúng ${result.readingCorrectCount || 0} / 40 câu</div>
      </div>
    ` : ''}

    ${result.scoreListening !== null && result.scoreListening !== undefined ? `
      <div class="score-badge listening">
        <div class="score-label">Listening Band</div>
        <div class="score-num">${result.scoreListening.toFixed(1)}</div>
        <div style="font-size: 10px; font-weight: 700;">Đúng ${result.listeningCorrectCount || 0} / 40 câu</div>
      </div>
    ` : ''}
  </div>

  <div class="stats-bar">
    <span>Thống kê chi tiết:</span>
    <span class="badge-correct">✓ Đúng: <strong>${correctCount}</strong></span>
    <span class="badge-wrong">✗ Sai: <strong>${wrongCount}</strong></span>
    <span class="badge-blank">○ Chưa trả lời: <strong>${unansweredCount}</strong></span>
    <span style="margin-left: auto; color: #475569;">Độ chính xác: <strong>${reviewList.length > 0 ? Math.round((correctCount / reviewList.length) * 100) : 0}%</strong></span>
  </div>

  ${result.feedback ? `
    <div class="feedback-box">
      <strong>Nhận xét từ Giảng viên / Hệ thống:</strong>
      <p style="margin: 4px 0 0 0; font-style: italic;">${result.feedback}</p>
    </div>
  ` : ''}

  <div style="margin-top: 16px;">
    <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 8px;">
      Bảng Đối Chiếu Chi Tiết Từng Câu Hỏi
    </h3>
    <table>
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">STT</th>
          <th style="width: 80px;">Kỹ Năng</th>
          <th style="width: 35%;">Câu Trả Lời Của Bạn</th>
          <th style="width: 35%;">Đáp Án Chính Xác</th>
          <th style="width: 85px; text-align: center;">Kết Quả</th>
        </tr>
      </thead>
      <tbody>
        ${reviewList.map((item) => {
          const isCorrect = Boolean(item.isCorrect ?? (item as any).correct);
          const hasAnswer = item.studentAnswer && item.studentAnswer.trim() !== '';
          const rowClass = isCorrect ? 'correct' : (hasAnswer ? 'wrong' : 'blank');
          const statusText = isCorrect ? '✓ ĐÚNG' : (hasAnswer ? '✗ SAI' : 'CHƯA LÀM');
          const statusClass = isCorrect ? 'text-correct' : (hasAnswer ? 'text-wrong' : 'badge-blank');

          return `
            <tr class="${rowClass}">
              <td style="text-align: center; font-weight: 800;">${item.questionNumber}</td>
              <td style="font-weight: 700; color: #475569;">${item.skill || 'READING'}</td>
              <td class="ans-mono ${isCorrect ? 'text-correct' : 'text-wrong'}">${item.studentAnswer || '(Để trống)'}</td>
              <td class="ans-mono text-correct">${item.correctAnswer || '-'}</td>
              <td style="text-align: center; font-weight: 800;" class="${statusClass}">${statusText}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer-note">
    Phiếu đối chiếu đáp án được trích xuất tự động từ Hệ thống LMS IELTS • Mã tra cứu: REG-${result.registrationId} • ${new Date().toLocaleDateString('vi-VN')}
  </div>

  <script>
    window.onload = function() {
      // Tự động mở hộp thoại in sau khi nạp xong nội dung
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * 2. XUẤT ĐÁP ÁN & BÀI LÀM RA FILE CSV (Hỗ trợ mở trực tiếp bằng Microsoft Excel với UTF-8 BOM)
 */
export function exportAnswerSheetCsv(result: ExamSubmissionResult): void {
  const reviewList = result.reviewDetails || [];
  const correctCount = reviewList.filter((q) => Boolean(q.isCorrect ?? (q as any).correct)).length;
  const unansweredCount = reviewList.filter((q) => !q.studentAnswer || q.studentAnswer.trim() === '').length;
  const wrongCount = reviewList.length - correctCount - unansweredCount;

  const lines: string[] = [];

  // Tiêu đề & Thông tin chung
  lines.push(`${escapeCsv('BẢNG ĐỐI CHIẾU ĐÁP ÁN & BÀI LÀM THÍ SINH (IELTS TEST REPORT)')}`);
  lines.push(`${escapeCsv('Thí sinh')},${escapeCsv(result.studentName || 'Thí sinh')}`);
  lines.push(`${escapeCsv('Kỳ thi')},${escapeCsv(result.eventTitle || '')}`);
  lines.push(`${escapeCsv('Ca thi')},${escapeCsv(result.shiftName || '')}`);
  lines.push(`${escapeCsv('Kỹ năng')},${escapeCsv(result.skillType || '')}`);
  lines.push(`${escapeCsv('Mã đăng ký')},${escapeCsv('#' + result.registrationId)}`);
  lines.push(`${escapeCsv('Thời gian nộp')},${escapeCsv(formatDateTime(result.submittedAt))}`);

  if (result.overallScore !== null && result.overallScore !== undefined) {
    lines.push(`${escapeCsv('Overall Band')},${escapeCsv(result.overallScore.toFixed(1))}`);
  }
  if (result.scoreReading !== null && result.scoreReading !== undefined) {
    lines.push(`${escapeCsv('Reading Band')},${escapeCsv(result.scoreReading.toFixed(1) + ' (Đúng ' + (result.readingCorrectCount || 0) + '/40)')}`);
  }
  if (result.scoreListening !== null && result.scoreListening !== undefined) {
    lines.push(`${escapeCsv('Listening Band')},${escapeCsv(result.scoreListening.toFixed(1) + ' (Đúng ' + (result.listeningCorrectCount || 0) + '/40)')}`);
  }
  if (result.feedback) {
    lines.push(`${escapeCsv('Nhận xét')},${escapeCsv(result.feedback)}`);
  }

  lines.push(`${escapeCsv('Thống kê')},${escapeCsv(`Đúng: ${correctCount} | Sai: ${wrongCount} | Chưa làm: ${unansweredCount}`)}`);
  lines.push(''); // Dòng trống ngăn cách

  // Header bảng chi tiết câu hỏi
  lines.push([
    escapeCsv('STT'),
    escapeCsv('Kỹ Năng'),
    escapeCsv('Câu Trả Lời Của Thí Sinh'),
    escapeCsv('Đáp Án Chính Xác'),
    escapeCsv('Kết Quả Đối Chiếu')
  ].join(','));

  // Danh sách từng câu hỏi
  for (const item of reviewList) {
    const isCorrect = Boolean(item.isCorrect ?? (item as any).correct);
    const hasAnswer = item.studentAnswer && item.studentAnswer.trim() !== '';
    const statusText = isCorrect ? 'ĐÚNG' : (hasAnswer ? 'SAI' : 'CHƯA TRẢ LỜI');

    lines.push([
      escapeCsv(item.questionNumber),
      escapeCsv(item.skill || 'READING'),
      escapeCsv(item.studentAnswer || '(Để trống)'),
      escapeCsv(item.correctAnswer || ''),
      escapeCsv(statusText)
    ].join(','));
  }

  // Tạo blob với ký tự UTF-8 BOM (\uFEFF) giúp Excel hiển thị đúng tiếng Việt
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Tên file thân thiện
  const safeStudentName = (result.studentName || 'thi_sinh')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');
  const fileName = `dap_an_${safeStudentName}_reg${result.registrationId}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
