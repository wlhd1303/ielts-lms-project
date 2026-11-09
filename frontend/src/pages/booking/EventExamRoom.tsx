import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  bookingService,
  type ExamAccessStatus,
  type StartExamResponse,
  type ExamSubmissionResult,
} from '../../services/bookingService';
import { parsePassageData, parseQuestionData, type PassageData } from '../../types/eventExamTypes';
import TextHighlightViewer from '../../components/exam/TextHighlightViewer';
import InteractivePdfViewer from '../../components/InteractivePdfViewer';
import EventLeaderboardModal from '../../components/booking/EventLeaderboardModal';

export default function EventExamRoom() {
  const { shiftId } = useParams();
  const shiftIdNum = Number(shiftId);
  const navigate = useNavigate();

  // State quản lý trạng thái truy cập
  const [accessStatus, setAccessStatus] = useState<ExamAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Đếm ngược phòng chờ (EARLY)
  const [secondsUntilStart, setSecondsUntilStart] = useState<number>(0);

  // Dữ liệu phòng thi (IN_PROGRESS)
  const [examData, setExamData] = useState<StartExamResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Quản lý giai đoạn thi tuần tự chuẩn IELTS: Listening -> Reading
  const [currentStage, setCurrentStage] = useState<'LISTENING' | 'READING'>('LISTENING');
  const [completedListening, setCompletedListening] = useState(false);
  const [leftTab, setLeftTab] = useState<'passage' | 'pdf'>('passage');
  const [submitting, setSubmitting] = useState(false);

  // Quản lý 3 Passages & Tab bài đọc đang xem
  const [activePassageId, setActivePassageId] = useState<number>(1);

  // Đánh dấu cờ Review cho từng câu hỏi
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  // Xem trước ảnh bản đồ/sơ đồ lớn (Lightbox)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Tab hiển thị tối ưu cho giao diện Mobile & Tablet (< lg)
  const [mobileTab, setMobileTab] = useState<'content' | 'questions' | 'navigator'>('content');
  const [activeQuestionNum, setActiveQuestionNum] = useState<number | null>(null);

  // Kết quả nộp bài
  const [resultRecord, setResultRecord] = useState<ExamSubmissionResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // Local storage auto-save keys (scop theo registrationId để tránh xung đột tài khoản)
  const regId = accessStatus?.registrationId || examData?.registrationId;
  const storageKey = regId ? `event_exam_draft_reg_${regId}` : `event_exam_draft_${shiftIdNum}`;
  const stageKey = regId ? `event_exam_stage_reg_${regId}` : `event_exam_stage_${shiftIdNum}`;
  const pdfHighlightKey = regId ? `event_pdf_hl_reg_${regId}` : `event_pdf_hl_${shiftIdNum}`;

  const getSavedDraft = () => {
    const primary = localStorage.getItem(storageKey);
    if (primary) return primary;
    return localStorage.getItem(`event_exam_draft_${shiftIdNum}`);
  };

  const getSavedStage = () => {
    const primary = localStorage.getItem(stageKey);
    if (primary) return primary;
    return localStorage.getItem(`event_exam_stage_${shiftIdNum}`);
  };

  // Tải trạng thái truy cập ban đầu
  const checkStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await bookingService.getExamAccessStatus(shiftIdNum);
      setAccessStatus(res);

      if (res.status === 'EARLY' && res.secondsUntilWindow) {
        setSecondsUntilStart(res.secondsUntilWindow);
      }

      if (res.status === 'IN_PROGRESS' || res.status === 'OPEN_WINDOW') {
        if (res.status === 'IN_PROGRESS') {
          await handleResumeExam();
        }
      }

      if ((res.status === 'SUBMITTED' || res.status === 'EXPIRED') && res.registrationId) {
        try {
          const result = await bookingService.getMyExamResult(res.registrationId);
          setResultRecord(result);
        } catch {
          // Giữ nguyên accessStatus nếu chưa có kết quả
        }
      }
    } catch (err: any) {
      console.error('Lỗi kiểm tra quyền vào thi:', err);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải thông tin phòng thi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shiftIdNum) {
      checkStatus();
    }
  }, [shiftIdNum]);

  // Đồng hồ đếm ngược phòng chờ (EARLY)
  useEffect(() => {
    if (accessStatus?.status !== 'EARLY' || secondsUntilStart <= 0) return;
    const interval = setInterval(() => {
      setSecondsUntilStart((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          checkStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [accessStatus?.status, secondsUntilStart]);

  // Bắt đầu làm bài thi (Học viên bấm Mở đề)
  const handleStartExam = async () => {
    try {
      setLoading(true);
      const data = await bookingService.startExam(shiftIdNum);
      setExamData(data);
      setTimeLeft(data.remainingSeconds || 3600);

      const hasPassages = !!data.passageText && data.passageText.trim().length > 0;
      const defaultToPdf = !!data.pdfUrl && !hasPassages;

      const savedStage = getSavedStage();
      if (data.skillType === 'BOTH') {
        if (savedStage === 'READING') {
          setCurrentStage('READING');
          setCompletedListening(true);
          setLeftTab(defaultToPdf ? 'pdf' : 'passage');
        } else {
          setCurrentStage('LISTENING');
          setCompletedListening(false);
          setLeftTab(defaultToPdf ? 'pdf' : 'passage');
        }
      } else if (data.skillType === 'LISTENING') {
        setCurrentStage('LISTENING');
        setLeftTab(defaultToPdf ? 'pdf' : 'passage');
      } else {
        setCurrentStage('READING');
        setLeftTab(defaultToPdf ? 'pdf' : 'passage');
      }

      const savedDraft = getSavedDraft();
      if (savedDraft) {
        try {
          setAnswers(JSON.parse(savedDraft));
        } catch {
          // ignore
        }
      }

      setAccessStatus((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể bắt đầu làm bài.');
    } finally {
      setLoading(false);
    }
  };

  // Khôi phục phiên thi đang làm dở
  const handleResumeExam = async () => {
    try {
      const data = await bookingService.startExam(shiftIdNum);
      setExamData(data);
      setTimeLeft(data.remainingSeconds || 0);

      const hasPassages = !!data.passageText && data.passageText.trim().length > 0;
      const defaultToPdf = !!data.pdfUrl && !hasPassages;

      const savedStage = getSavedStage();
      if (data.skillType === 'BOTH') {
        if (savedStage === 'READING') {
          setCurrentStage('READING');
          setCompletedListening(true);
          setLeftTab(defaultToPdf ? 'pdf' : 'passage');
        } else {
          setCurrentStage('LISTENING');
          setCompletedListening(false);
          setLeftTab(defaultToPdf ? 'pdf' : 'passage');
        }
      } else if (data.skillType === 'LISTENING') {
        setCurrentStage('LISTENING');
        setLeftTab(defaultToPdf ? 'pdf' : 'passage');
      } else {
        setCurrentStage('READING');
        setLeftTab(defaultToPdf ? 'pdf' : 'passage');
      }

      const savedDraft = getSavedDraft();
      if (savedDraft) {
        try {
          setAnswers(JSON.parse(savedDraft));
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Không thể tiếp tục phiên thi:', err);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải đề thi.');
    }
  };

  // Hoàn thành phần thi Listening và chuyển sang phần thi Reading
  const handleCompleteListeningAndSwitchToReading = () => {
    if (!examData) return;
    const listeningQuestions = examData.questions.filter((q) => q.skill === 'LISTENING');
    let answeredCount = 0;
    listeningQuestions.forEach((q) => {
      const k1 = `LISTENING_${q.questionNumber}`;
      const k2 = String(q.questionNumber);
      if (answers[k1] || answers[k2]) answeredCount++;
    });

    const confirmMsg = `Bạn đã trả lời ${answeredCount}/40 câu của phần thi Listening.\n\nBạn có chắc chắn muốn nộp phần Listening và chuyển sang phần thi Reading không?\n\n(Lưu ý: Sau khi chuyển sang Reading, bài thi Listening sẽ được khóa lại để bảo đảm tính nghiêm túc của kỳ thi).`;

    if (window.confirm(confirmMsg)) {
      setCompletedListening(true);
      setCurrentStage('READING');
      setMobileTab('content');
      localStorage.setItem(stageKey, 'READING');
      if (examData.passageText) {
        setLeftTab('passage');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Đồng hồ đếm ngược thời gian làm bài (IN_PROGRESS)
  useEffect(() => {
    if (!examData || timeLeft <= 0 || resultRecord) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examData, timeLeft, resultRecord]);

  // Cập nhật đáp án & tự động lưu localStorage
  const handleAnswerChange = (key: string, value: string) => {
    if (resultRecord) return;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Nộp bài thi
  const handleSubmit = async (isTimeout = false) => {
    if (submitting || resultRecord) return;

    if (!isTimeout) {
      const answeredCount = Object.keys(answers).length;
      if (!window.confirm(`Bạn đã trả lời ${answeredCount} câu hỏi. Bạn có chắc chắn muốn nộp bài?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await bookingService.submitExam(shiftIdNum, answers);
      setResultRecord(res);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(stageKey);
      localStorage.removeItem(pdfHighlightKey);
      localStorage.removeItem(`event_exam_draft_${shiftIdNum}`);
      localStorage.removeItem(`event_exam_stage_${shiftIdNum}`);
      localStorage.removeItem(`event_pdf_hl_${shiftIdNum}`);
      setAccessStatus((prev) => (prev ? { ...prev, status: 'SUBMITTED' } : null));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmit(true);
  };

  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const userRole = localStorage.getItem('role') || '';
  const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

  const handleResetMyExam = async () => {
    if (!window.confirm('Đặt lại lượt thi này để làm lại từ đầu? Tất cả câu trả lời trước đó sẽ được xóa.')) {
      return;
    }
    try {
      setLoading(true);
      await bookingService.resetMyExam(shiftIdNum);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(stageKey);
      localStorage.removeItem(pdfHighlightKey);
      localStorage.removeItem(`event_exam_draft_${shiftIdNum}`);
      localStorage.removeItem(`event_exam_stage_${shiftIdNum}`);
      localStorage.removeItem(`event_pdf_hl_${shiftIdNum}`);
      setResultRecord(null);
      setExamData(null);
      setAnswers({});
      await checkStatus();
      alert('Đã đặt lại lượt thi thành công! Bạn có thể bắt đầu làm bài lại.');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Không thể đặt lại lượt thi.');
    } finally {
      setLoading(false);
    }
  };

  // --- HIGHLIGHT CÂU HỎI & ĐỀ BÀI (QUESTION SHEET) ---
  const questionSheetRef = useRef<HTMLDivElement>(null);
  const [questionFloatingMenu, setQuestionFloatingMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const handleQuestionMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }
    const text = sel.toString().trim();
    if (text.length === 0) {
      setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = sel.getRangeAt(0);
    if (!questionSheetRef.current?.contains(range.commonAncestorContainer)) {
      setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setQuestionFloatingMenu({
        x: rect.left + rect.width / 2,
        y: Math.max(10, rect.top - 46),
        visible: true,
      });
    }
  };

  const applyQuestionHighlight = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) return;

    try {
      const mark = document.createElement('mark');
      mark.className = 'ielts-question-hl bg-amber-300 text-slate-900 font-bold px-1 py-0.5 rounded cursor-pointer transition-all hover:bg-amber-400 shadow-xs';
      mark.title = 'Click để bỏ highlight';
      try {
        range.surroundContents(mark);
      } catch {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
    } catch (e) {
      console.warn('Không thể bọc highlight câu hỏi:', e);
    }
    sel.removeAllRanges();
    setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleQuestionSheetClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mark = target.closest('.ielts-question-hl') as HTMLElement;
    if (mark) {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
      parent?.normalize();
      setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          const range = sel.getRangeAt(0);
          if (questionSheetRef.current?.contains(range.commonAncestorContainer)) {
            e.preventDefault();
            applyQuestionHighlight();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- RENDER 1: LOADING HOẶC LỖI ---
  if (loading && !examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Đang chuẩn bị phòng thi...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-base font-black text-slate-900">Không thể truy cập</h2>
          <p className="text-xs text-slate-500 font-medium">{errorMsg}</p>
          <button
            onClick={() => navigate('/booking')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            Quay lại Lịch Thi Thử
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 2: ĐÃ NỘP BÀI (HIỂN THỊ ĐIỂM CÁ NHÂN & REVIEW) ---
  if (resultRecord) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col items-center justify-center">
        <div className="bg-white max-w-3xl w-full rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white text-center relative">
            <span className="text-4xl mb-2 block">🎓</span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full inline-block mb-2">
              KẾT QUẢ THI ONLINE CHÍNH THỨC
            </span>
            <h1 className="text-xl md:text-2xl font-black">{resultRecord.eventTitle}</h1>
            <p className="text-xs text-blue-100 font-medium mt-1">
              Thí sinh: <strong className="text-white">{resultRecord.studentName}</strong> • {resultRecord.shiftName}
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {resultRecord.scoreListening !== null && resultRecord.scoreListening !== undefined && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-center flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Listening Band</span>
                  <span className="text-4xl font-black text-emerald-600 my-1">{resultRecord.scoreListening.toFixed(1)}</span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Đúng {resultRecord.listeningCorrectCount || 0} / 40 câu
                  </span>
                </div>
              )}

              {resultRecord.scoreReading !== null && resultRecord.scoreReading !== undefined && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 text-center flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Reading Band</span>
                  <span className="text-4xl font-black text-blue-600 my-1">{resultRecord.scoreReading.toFixed(1)}</span>
                  <span className="text-[11px] font-semibold text-blue-700">
                    Đúng {resultRecord.readingCorrectCount || 0} / 40 câu
                  </span>
                </div>
              )}

              {resultRecord.overallScore !== null && resultRecord.overallScore !== undefined && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-center text-white sm:col-span-1 shadow-md">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Overall Band Score</span>
                  <span className="text-4xl font-black text-white my-1">{resultRecord.overallScore.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Quy đổi chuẩn Quốc tế</span>
                </div>
              )}
            </div>

            {resultRecord.feedback && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-slate-700">Nhận xét từ giáo viên/hệ thống:</span>
                <p className="text-slate-600 italic leading-relaxed">{resultRecord.feedback}</p>
              </div>
            )}

            {resultRecord.allowReview && resultRecord.reviewDetails && resultRecord.reviewDetails.length > 0 && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{showReview ? '▲ Thu gọn bảng xem lại đáp án' : '▼ Xem chi tiết đáp án & câu trả lời của bạn'}</span>
                </button>

                {showReview && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-3">Câu</th>
                          <th className="p-3">Kỹ năng</th>
                          <th className="p-3">Câu trả lời của bạn</th>
                          <th className="p-3">Đáp án chuẩn</th>
                          <th className="p-3 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultRecord.reviewDetails.map((item, idx) => (
                          <tr key={idx} className={item.isCorrect ? 'bg-emerald-50/30' : 'bg-rose-50/30'}>
                            <td className="p-3 font-bold">{item.questionNumber}</td>
                            <td className="p-3 text-slate-500 font-medium">{item.skill}</td>
                            <td className="p-3 font-semibold text-slate-800">{item.studentAnswer || '(Để trống)'}</td>
                            <td className="p-3 font-bold text-emerald-700">{item.correctAnswer}</td>
                            <td className="p-3 text-center">
                              {item.isCorrect ? (
                                <span className="text-emerald-600 font-bold">✓ Đúng</span>
                              ) : (
                                <span className="text-rose-500 font-bold">✗ Sai</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
              <button
                onClick={() => navigate('/booking')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ← Quay lại Trang Chủ
              </button>

              <button
                onClick={() => setShowLeaderboardModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2"
              >
                <span>🏆 Xem Vị Trí Của Bạn Trên Bảng Xếp Hạng</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bảng Xếp Hạng Đợt Thi */}
        <EventLeaderboardModal
          isOpen={showLeaderboardModal}
          onClose={() => setShowLeaderboardModal(false)}
          eventId={resultRecord.eventId}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // --- RENDER 3: PHÒNG CHỜ (EARLY) ---
  if (accessStatus?.status === 'EARLY') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-4xl">
            ⏳
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
              PHÒNG CHỜ THI TRỰC TUYẾN
            </span>
            <h1 className="text-xl md:text-2xl font-black mt-3">{accessStatus.eventTitle}</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Ca thi: <strong>{accessStatus.shiftName}</strong>
            </p>
          </div>

          <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
              Thời gian đếm ngược đến giờ mở đề:
            </span>
            <span className="font-mono text-4xl md:text-5xl font-black text-amber-400 tracking-wider">
              {formatSeconds(secondsUntilStart)}
            </span>
          </div>

          <div className="text-left bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-1.5 font-medium">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>📋</span> Quy chế mở đề thi:
            </p>
            <p>• Khung giờ mở đề diễn ra trong suốt thời gian ca thi.</p>
            <p>• Thời gian làm bài <strong>({accessStatus.durationMinutes} phút)</strong> chỉ bắt đầu đếm ngược khi bạn bấm "Bắt đầu làm bài".</p>
            <p>• Hệ thống sẽ tự động chuyển sang trang mở đề ngay khi đồng hồ điểm 00:00:00.</p>
          </div>

          {isAdmin && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-left">
              <span className="text-[11px] font-bold text-amber-300 block">
                👑 Bạn là Admin: Có thể mở đề kiểm thử ngay mà không cần đợi đếm ngược
              </span>
              <button
                onClick={handleStartExam}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                🚀 Bỏ Qua Chờ & Mở Đề Thi Ngay (Admin Mode)
              </button>
            </div>
          )}

          <button
            onClick={() => navigate('/booking')}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ← Quay lại Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 4: CỬA SỔ MỞ ĐỀ (OPEN_WINDOW) ---
  if (accessStatus?.status === 'OPEN_WINDOW') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-6 shadow-xl animate-[fadeIn_0.3s_ease-out]">
          <div className="inline-flex p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-4xl">
            🚀
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              CỔNG THI ĐANG MỞ
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-3">{accessStatus.eventTitle}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Ca thi: <strong>{accessStatus.shiftName}</strong> • Thời lượng: <strong>{accessStatus.durationMinutes} phút</strong>
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-left text-xs text-blue-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-blue-950">
              <span>💡</span> Lưu ý quan trọng trước khi làm bài:
            </p>
            <p>• Cổng mở đề sẽ mở trong suốt ca thi. Bạn đang nằm trong khung giờ hợp lệ để làm bài.</p>
            <p>• Đồng hồ làm bài <strong>{accessStatus.durationMinutes} phút</strong> của bạn sẽ bắt đầu đếm ngược ngay khi bạn bấm nút dưới đây.</p>
            <p>• Có thể sử dụng tính năng <strong>Highlight & Bỏ highlight</strong> trực tiếp trên bài đọc bằng chuột hoặc phím tắt <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-sm">Ctrl+H</kbd>.</p>
            <p>• Hệ thống hỗ trợ Auto-save liên tục, không lo mất bài khi mất mạng.</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleStartExam}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              🚀 BẮT ĐẦU LÀM BÀI NGAY
            </button>
            <button
              onClick={() => navigate('/booking')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Để lát nữa quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 5: BỎ LỠ CỬA SỔ MỞ ĐỀ (MISSED_WINDOW) ---
  if (accessStatus?.status === 'MISSED_WINDOW') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
          <span className="text-5xl">⏰</span>
          <h2 className="text-base font-black text-rose-700">Đã quá giờ mở đề thi</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Thời gian mở cổng của ca thi này đã kết thúc. Bạn không thể mở bài thi mới được nữa.
          </p>
          <button
            onClick={() => navigate('/booking')}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Quay lại Danh sách Đợt thi
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 6: PHIÊN THI ĐÃ HẾT HẠN (EXPIRED) ---
  if (accessStatus?.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 p-8 text-center space-y-4 shadow-sm animate-scaleUp">
          <span className="text-5xl">⌛</span>
          <h2 className="text-base font-black text-amber-800">Thời gian làm bài đã kết thúc</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Phiên làm bài của ca thi này đã kết thúc do đã vượt quá thời gian quy định ({accessStatus.durationMinutes || 120} phút).
          </p>
          <div className="space-y-2 pt-2">
            {accessStatus.registrationId && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await bookingService.getMyExamResult(accessStatus.registrationId!);
                    setResultRecord(res);
                  } catch (e: any) {
                    alert('Chưa có bảng điểm hoặc bài thi chưa được lưu.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎓</span>
                <span>Xem Kết Quả & Điểm Thi Đã Thu</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleResetMyExam}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black transition-all shadow-md shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔄</span>
                <span>Reset Lượt Thi (Chế Độ Admin)</span>
              </button>
            )}

            <button
              onClick={() => navigate('/booking')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Quay lại Lịch Thi & Đặt Chỗ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 7: PHÒNG THI ONLINE (IN_PROGRESS) ---
  if (!examData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-black text-slate-800">Đang khởi tạo phòng thi...</h2>
          <p className="text-xs text-slate-400">Nếu trang không tự cập nhật sau vài giây, vui lòng bấm Tải lại.</p>
          <button
            onClick={() => checkStatus()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Tải Lại Phòng Thi
          </button>
        </div>
      </div>
    );
  }

  const isWarningTime = timeLeft <= 300;
  const isBoth = examData.skillType === 'BOTH';
  const activeSkill = isBoth ? currentStage : examData.skillType;
  const currentSkillQuestions = examData.questions.filter((q) => q.skill === activeSkill);

  // Parse 3 Passages
  const parsedPassages: PassageData[] = parsePassageData(examData.passageText);
  const currentPassage = parsedPassages.find((p) => p.id === activePassageId) || parsedPassages[0];

  // Đếm số câu đã làm trong kỹ năng hiện tại
  let currentSkillAnsweredCount = 0;
  currentSkillQuestions.forEach((q) => {
    const k1 = `${q.skill}_${q.questionNumber}`;
    const k2 = String(q.questionNumber);
    if (answers[k1] || answers[k2]) currentSkillAnsweredCount++;
  });

  // Chọn câu hỏi từ Navigator -> Cuộn đến câu hỏi & chuyển tab Passage tương ứng
  const handleSelectQuestion = (num: number) => {
    setActiveQuestionNum(num);

    // Tự động chuyển Passage ở cột trái nếu là bài Reading hoặc Listening
    if (activeSkill === 'READING') {
      if (num <= 13) setActivePassageId(1);
      else if (num <= 26) setActivePassageId(2);
      else setActivePassageId(3);
    } else if (activeSkill === 'LISTENING') {
      if (num <= 10) setActivePassageId(1);
      else if (num <= 20) setActivePassageId(2);
      else if (num <= 30) setActivePassageId(3);
      else setActivePassageId(4);
    }

    const el = document.getElementById(`q_box_${activeSkill}_${num}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setMobileTab('questions');
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-100 text-slate-800">
      {/* THANH ĐIỀU KHIỂN DÀNH CHO ADMIN */}
      {isAdmin && (
        <div className="bg-slate-900 text-white px-3 md:px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 z-30">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 font-black text-[10px] tracking-wider uppercase">
              Admin Mode
            </span>
            <span className="text-slate-300 font-medium text-[11px] hidden sm:inline">
              Bạn đang kiểm thử phòng thi dưới quyền Quản Trị Viên
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetMyExam}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg text-[11px] font-black cursor-pointer shadow-sm transition-all flex items-center gap-1"
            >
              <span>🔄</span>
              <span>Reset Lượt Thi (Làm Lại)</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER PHÒNG THI */}
      <header className="h-14 bg-white shadow-xs flex items-center justify-between px-3 md:px-6 z-20 shrink-0 border-b border-slate-200/80">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => {
              if (window.confirm('Thoát phòng thi? Đồng hồ vẫn sẽ tiếp tục chạy theo thời gian thực!')) {
                navigate('/booking');
              }
            }}
            className="p-1.5 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer shrink-0"
            title="Rời phòng thi"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {examData.eventTitle}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isBoth ? (
                <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  currentStage === 'LISTENING'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {currentStage === 'LISTENING' ? '🎧 Listening (1/2)' : '📖 Reading (2/2)'}
                </span>
              ) : (
                <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                  {examData.skillType}
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline truncate">
                • {examData.shiftName}
              </span>
            </div>
          </div>
        </div>

        {/* Thanh trạng thái nhanh trên Header */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-xl font-mono text-xs md:text-sm font-black shadow-xs border transition-all ${
              isWarningTime
                ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <span>⏱️</span>
            <span>{formatSeconds(timeLeft)}</span>
          </div>

          {isBoth && currentStage === 'LISTENING' && timeLeft > 0 ? (
            <button
              onClick={handleCompleteListeningAndSwitchToReading}
              className="px-3 md:px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Nộp Listening & Sang Reading</span>
              <span className="sm:hidden">Sang Reading</span>
              <span>➔</span>
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className={`px-3 md:px-4 py-1.5 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                timeLeft <= 0
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              <span>🎓</span>
              <span>{submitting ? 'Đang nộp...' : 'Nộp Bài'}</span>
            </button>
          )}
        </div>
      </header>

      {/* SEGMENTED TAB SWITCHER CHO MOBILE & TABLET (< LG) */}
      <div className="lg:hidden flex items-center bg-white border-b border-slate-200 px-3 py-2 gap-2 shrink-0 z-10 shadow-xs">
        <button
          onClick={() => setMobileTab('content')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'content'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>{activeSkill === 'LISTENING' ? '🎧 Audio' : `📖 Passage ${activePassageId}`}</span>
        </button>
        <button
          onClick={() => setMobileTab('questions')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'questions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>📝 Câu hỏi</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            mobileTab === 'questions' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            {currentSkillAnsweredCount}/40
          </span>
        </button>
        <button
          onClick={() => setMobileTab('navigator')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
            mobileTab === 'navigator'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>⏱️ Nộp & Bảng Số</span>
        </button>
      </div>

      {/* WORKSPACE 3 CỘT CHUẨN THI MÁY (DESKTOP: 3 PANES; MOBILE: SEGMENTED SWITCHER) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative p-2 md:p-3 gap-2 md:gap-3">
        {/* CỘT 1 (TRÁI): ĐỀ THI (PDF / BÀI ĐỌC / BÀI NGHE / MAP / DIAGRAM) + AUDIO STICKY NẾU LISTENING */}
        <div className={`w-full lg:w-[44%] xl:w-[46%] h-full flex flex-col overflow-hidden relative bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-xs ${
          mobileTab === 'content' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* THANH PHÁT AUDIO CHUYÊN NGHIỆP STICKY DÀNH CHO LISTENING */}
          {activeSkill === 'LISTENING' && (
            <div className="p-3 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white flex flex-col gap-2 shrink-0 border-b border-purple-800 shadow-sm z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-purple-500/20 text-purple-300 rounded-md text-xs">🎧</span>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    Official Audio Track
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isBoth && (
                    <button
                      onClick={handleCompleteListeningAndSwitchToReading}
                      className="px-2 py-0.5 bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-purple-400/30 cursor-pointer"
                    >
                      Sang Reading ➔
                    </button>
                  )}
                  <span className="text-[10px] font-bold bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30">
                    IELTS Listening
                  </span>
                </div>
              </div>

              <audio
                controls
                autoPlay
                className="w-full h-9 rounded-lg outline-none"
                src={examData.audioUrl || '/sample-ielts-listening.wav'}
              >
                Trình duyệt của bạn không hỗ trợ phát âm thanh.
              </audio>
            </div>
          )}

          {/* THANH HEADER ĐIỀU KHIỂN ĐỀ THI: CHỌN PART / PASSAGE HOẶC CHUYỂN ĐỔI PDF */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {(activeSkill === 'LISTENING'
                ? (parsedPassages.length >= 4 ? [1, 2, 3, 4] : [1, 2, 3])
                : [1, 2, 3]
              ).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setActivePassageId(num);
                    setLeftTab('passage');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activePassageId === num && leftTab === 'passage'
                      ? activeSkill === 'LISTENING'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {activeSkill === 'LISTENING' ? `Part ${num}` : `Passage ${num}`}
                </button>
              ))}
            </div>

            {examData.pdfUrl && (
              <button
                type="button"
                onClick={() => setLeftTab(leftTab === 'pdf' ? 'passage' : 'pdf')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  leftTab === 'pdf'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-black'
                }`}
              >
                <span>{leftTab === 'pdf' ? '📝 Xem Đề Văn Bản' : '📄 Xem PDF Đề Thi'}</span>
              </button>
            )}
          </div>

          {/* VÙNG HIỂN THỊ NỘI DUNG ĐỀ THI: PDF HOẶC VĂN BẢN / HÌNH ẢNH MAP */}
          <div className="flex-1 overflow-hidden relative">
            {leftTab === 'pdf' && examData.pdfUrl ? (
              <div className="w-full h-full overflow-hidden">
                <InteractivePdfViewer
                  pdfUrl={examData.pdfUrl}
                  storageKey={pdfHighlightKey}
                />
              </div>
            ) : (currentPassage && (currentPassage.content || currentPassage.imageUrl || currentPassage.title || currentPassage.instruction)) ? (
              <TextHighlightViewer
                content={currentPassage.content}
                title={currentPassage.title}
                instruction={currentPassage.instruction}
                imageUrl={currentPassage.imageUrl}
                onImageClick={(url) => setPreviewImageUrl(url)}
              />
            ) : examData.pdfUrl ? (
              // Nếu chưa có text của passage nhưng có PDF URL -> tự động hiển thị PDF đề thi luôn!
              <div className="w-full h-full overflow-hidden">
                <InteractivePdfViewer
                  pdfUrl={examData.pdfUrl}
                  storageKey={pdfHighlightKey}
                />
              </div>
            ) : (
              <div className="w-full h-full p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/80 space-y-2 text-center">
                    <span className="text-3xl">🎧</span>
                    <h4 className="font-black text-slate-800 text-sm">
                      {activeSkill === 'LISTENING' ? 'IELTS Academic Listening' : 'IELTS Academic Reading'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {activeSkill === 'LISTENING'
                        ? 'Đề thi đã sẵn sàng. Bạn hãy lắng nghe đoạn ghi âm và trả lời 40 câu hỏi ở cột bên phải.'
                        : 'Chưa có nội dung văn bản cho phần đọc này.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
                    <h4 className="font-black text-slate-800 flex items-center gap-1.5">
                      <span>📋</span> Hướng Dẫn Thí Sinh:
                    </h4>
                    <ul className="space-y-1.5 list-disc pl-4 text-slate-600 leading-relaxed font-medium text-[11px]">
                      <li>Bạn có 40 câu hỏi ở cột câu hỏi bên phải.</li>
                      <li>Chọn hoặc điền đáp án trực tiếp vào ô tương ứng cho từng câu.</li>
                      {activeSkill === 'LISTENING' && isBoth && (
                        <li>Sau khi hoàn thành phần Listening, bấm <strong className="text-purple-700">"Sang Reading ➔"</strong> để làm tiếp phần Đọc.</li>
                      )}
                      <li>Có thể click vào số thứ tự câu hỏi ở bảng bên phải để di chuyển nhanh.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỘT 2 (GIỮA): PHIẾU CÂU HỎI (QUESTION SHEET CUỘN DỌC, CÓ XUỐNG DÒNG, BADGE TRÒN & ẢNH MAP) */}
        <div className={`w-full lg:w-[32%] xl:w-[33%] h-full flex flex-col bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs ${
          mobileTab === 'questions' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Header Phiếu câu hỏi */}
          <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider">
                {activeSkill === 'LISTENING' ? '🎧 Phiếu Listening' : '📖 Phiếu Reading'}
              </span>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                {currentSkillAnsweredCount}/40 câu
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-bold hidden xl:inline-flex items-center gap-1">
                <span>🖍️</span>
                <span>Ctrl+H</span>
              </span>
              <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">
                Auto-Saved
              </span>
            </div>
          </div>

          {/* Floating Highlight Toolbar cho câu hỏi */}
          {questionFloatingMenu.visible && (
            <div
              style={{ left: `${Math.min(window.innerWidth - 160, Math.max(160, questionFloatingMenu.x))}px`, top: `${questionFloatingMenu.y}px` }}
              className="fixed z-50 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                onClick={applyQuestionHighlight}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-black transition-all cursor-pointer shadow-sm"
              >
                <span>🖍️</span>
                <span>Highlight Câu Hỏi (Ctrl+H)</span>
              </button>
              <button
                onClick={() => setQuestionFloatingMenu((prev) => ({ ...prev, visible: false }))}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Đóng"
              >
                ✕
              </button>
            </div>
          )}

          {/* Danh sách 40 câu hỏi cuộn dọc */}
          <div
            ref={questionSheetRef}
            onMouseUp={handleQuestionMouseUp}
            onClick={handleQuestionSheetClick}
            className="flex-1 p-3 md:p-4 overflow-y-auto custom-scrollbar space-y-3 bg-slate-50/50 relative select-text"
          >
            {currentSkillQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                Chưa có câu hỏi nào được khai báo cho phần thi này.
              </div>
            ) : (
              currentSkillQuestions.map((q) => {
                const answerKey = `${q.skill}_${q.questionNumber}`;
                const val = answers[answerKey] !== undefined ? answers[answerKey] : (answers[String(q.questionNumber)] || '');
                const isActive = activeQuestionNum === q.questionNumber;
                const isFlagged = !!reviewFlags[answerKey];
                const parsedQ = parseQuestionData(q.questionText);

                return (
                  <div
                    key={answerKey}
                    id={`q_box_${answerKey}`}
                    onClick={() => setActiveQuestionNum(q.questionNumber)}
                    className={`p-3.5 bg-white rounded-2xl border transition-all ${
                      isActive ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm' : 'border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    {/* Header câu hỏi: Số câu badge tròn + Nội dung + Nút gắn cờ Review */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                          {q.questionNumber}
                        </span>
                        <div className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed">
                          {parsedQ.prompt || `Câu hỏi số ${q.questionNumber}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewFlags((prev) => ({ ...prev, [answerKey]: !prev[answerKey] }));
                        }}
                        className={`p-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                          isFlagged
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title={isFlagged ? 'Bỏ cờ review' : 'Gắn cờ review'}
                      >
                        {isFlagged ? '🚩 Review' : '🏳️'}
                      </button>
                    </div>

                    {/* Hình ảnh bản đồ/sơ đồ gắn riêng theo câu hỏi (nếu có) */}
                    {parsedQ.imageUrl && (
                      <div className="my-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block">
                        <img
                          src={parsedQ.imageUrl}
                          alt={`Minh họa câu ${q.questionNumber}`}
                          className="max-h-56 max-w-full rounded-lg object-contain cursor-zoom-in hover:opacity-95"
                          onClick={() => setPreviewImageUrl(parsedQ.imageUrl!)}
                        />
                        <span
                          className="text-[10px] text-blue-600 font-bold mt-1 block text-center cursor-pointer hover:underline"
                          onClick={() => setPreviewImageUrl(parsedQ.imageUrl!)}
                        >
                          🔍 Nhấp để phóng to bản đồ/sơ đồ
                        </span>
                      </div>
                    )}

                    {/* Khu vực chọn / điền đáp án theo dạng */}
                    <div className="pt-2.5">
                      {parsedQ.type === 'MULTIPLE_CHOICE' ? (
                        <div className="space-y-1.5">
                          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                            const optText = parsedQ.options?.[optKey] || '';
                            const isSelected = (val || '').toUpperCase() === optKey;
                            return (
                              <label
                                key={optKey}
                                onClick={() => handleAnswerChange(answerKey, optKey)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-500 shadow-2xs ring-1 ring-blue-400'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold transition-all ${
                                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex-1 text-xs text-slate-800 leading-relaxed select-text">
                                  <strong className="mr-1.5 font-bold">{optKey}.</strong>
                                  <span>{optText || `Lựa chọn ${optKey}`}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : parsedQ.type === 'TFNG' ? (
                        <div className="flex flex-wrap gap-2">
                          {['TRUE', 'FALSE', 'NOT GIVEN'].map((choice) => {
                            const isSelected = (val || '').toUpperCase() === choice;
                            return (
                              <button
                                type="button"
                                key={choice}
                                onClick={() => handleAnswerChange(answerKey, choice)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nhập câu trả lời của bạn..."
                          value={val}
                          onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                          onFocus={() => setActiveQuestionNum(q.questionNumber)}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all uppercase placeholder:normal-case placeholder:font-normal"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT 3 (PHẢI): ĐỒNG HỒ, NỘP BÀI & BẢNG ĐIỀU HƯỚNG CÂU HỎI THEO PASSAGE */}
        <div className={`w-full lg:w-[24%] xl:w-[21%] h-full flex flex-col bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 p-3 md:p-4 shadow-xs overflow-hidden shrink-0 ${
          mobileTab === 'navigator' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* ĐỒNG HỒ & NÚT NỘP BÀI */}
          <div className="pb-3 border-b border-slate-100 space-y-2.5 shrink-0">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Thời gian còn lại:</span>
              <span className={`font-mono text-2xl md:text-3xl font-black block tracking-wider ${
                isWarningTime ? 'text-rose-600 animate-pulse' : 'text-slate-900'
              }`}>
                {formatSeconds(timeLeft)}
              </span>
            </div>

            {/* Nút nộp bài */}
            {isBoth && currentStage === 'LISTENING' && timeLeft > 0 ? (
              <button
                onClick={handleCompleteListeningAndSwitchToReading}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Nộp Listening & Sang Reading</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className={`w-full py-2.5 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  timeLeft <= 0
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                <span>🎓 NỘP BÀI</span>
              </button>
            )}

            {/* Thông tin lưu bài */}
            <div className="space-y-1 text-[10px] text-slate-500 pt-1">
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>✓ Tự động lưu bài</span>
                <span className="text-[9px] text-slate-400 font-mono">Auto-Saved</span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">
                💡 Bạn có thể gắn cờ trên câu hỏi để nhớ xem lại trước khi nộp.
              </p>
            </div>
          </div>

          {/* BẢNG ĐIỀU HƯỚNG 40 CÂU HỎI THEO PASSAGE / PART */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 space-y-3.5">
            {(activeSkill === 'LISTENING'
              ? [
                  { passageNum: 1, label: 'Part 1', range: [1, 10] as const },
                  { passageNum: 2, label: 'Part 2', range: [11, 20] as const },
                  { passageNum: 3, label: 'Part 3', range: [21, 30] as const },
                  { passageNum: 4, label: 'Part 4', range: [31, 40] as const },
                ]
              : [
                  { passageNum: 1, label: 'Passage 1', range: [1, 13] as const },
                  { passageNum: 2, label: 'Passage 2', range: [14, 26] as const },
                  { passageNum: 3, label: 'Passage 3', range: [27, 40] as const },
                ]
            ).map((grp) => {
              const grpQuestions = currentSkillQuestions.filter(
                (q) => q.questionNumber >= grp.range[0] && q.questionNumber <= grp.range[1]
              );
              if (grpQuestions.length === 0) return null;

              return (
                <div key={grp.passageNum} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800">
                    <span>{grp.label}</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      (Câu {grp.range[0]} - {grp.range[1]})
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {grpQuestions.map((q) => {
                      const answerKey = `${q.skill}_${q.questionNumber}`;
                      const isFilled = !!answers[answerKey] || !!answers[String(q.questionNumber)];
                      const isActive = activeQuestionNum === q.questionNumber;
                      const isFlagged = !!reviewFlags[answerKey];

                      return (
                        <button
                          key={answerKey}
                          type="button"
                          onClick={() => handleSelectQuestion(q.questionNumber)}
                          className={`relative h-7 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center justify-center ${
                            isActive
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm scale-105'
                              : isFlagged
                              ? 'bg-amber-100 text-amber-900 border border-amber-400 font-extrabold'
                              : isFilled
                              ? 'bg-blue-50 text-blue-800 border border-blue-300 font-extrabold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
                          }`}
                          title={`Câu ${q.questionNumber}: ${isFilled ? 'Đã làm' : 'Chưa làm'}${isFlagged ? ' (Đã gắn cờ review)' : ''}`}
                        >
                          {q.questionNumber}
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 text-[8px]">🚩</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL PHÓNG TO HÌNH ẢNH BẢN ĐỒ / SƠ ĐỒ */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white font-black text-xs bg-white/20 hover:bg-white/40 px-3 py-1 rounded-full cursor-pointer"
            >
              ✕ Đóng ảnh
            </button>
            <img
              src={previewImageUrl}
              alt="Map Enlarged"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
