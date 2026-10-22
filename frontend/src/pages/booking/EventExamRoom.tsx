import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  bookingService,
  type ExamAccessStatus,
  type StartExamResponse,
  type ExamSubmissionResult,
  type StudentQuestion
} from '../../services/bookingService';
import TextHighlightViewer from '../../components/exam/TextHighlightViewer';
import InteractivePdfViewer from '../../components/InteractivePdfViewer';

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

  // Tab hiển thị tối ưu cho giao diện Mobile & Tablet (< md)
  const [mobileTab, setMobileTab] = useState<'content' | 'questions'>('content');
  const [activeQuestionNum, setActiveQuestionNum] = useState<number | null>(null);

  // Kết quả nộp bài
  const [resultRecord, setResultRecord] = useState<ExamSubmissionResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Local storage auto-save keys
  const storageKey = `event_exam_draft_${shiftIdNum}`;
  const stageKey = `event_exam_stage_${shiftIdNum}`;

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
        // Tự động load đề thi nếu đã đang làm dở
        if (res.status === 'IN_PROGRESS') {
          await handleResumeExam();
        }
      }

      if (res.status === 'SUBMITTED' && res.registrationId) {
        const result = await bookingService.getMyExamResult(res.registrationId);
        setResultRecord(result);
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
          checkStatus(); // Chuyển sang OPEN_WINDOW ngay lập tức
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

      const savedStage = localStorage.getItem(stageKey);
      if (data.skillType === 'BOTH') {
        if (savedStage === 'READING') {
          setCurrentStage('READING');
          setCompletedListening(true);
          setLeftTab('passage');
        } else {
          setCurrentStage('LISTENING');
          setCompletedListening(false);
        }
      } else if (data.skillType === 'LISTENING') {
        setCurrentStage('LISTENING');
      } else {
        setCurrentStage('READING');
        if (data.passageText) setLeftTab('passage');
      }

      // Khôi phục draft từ localStorage nếu có
      const savedDraft = localStorage.getItem(storageKey);
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

      const savedStage = localStorage.getItem(stageKey);
      if (data.skillType === 'BOTH') {
        if (savedStage === 'READING') {
          setCurrentStage('READING');
          setCompletedListening(true);
          setLeftTab('passage');
        } else {
          setCurrentStage('LISTENING');
          setCompletedListening(false);
        }
      } else if (data.skillType === 'LISTENING') {
        setCurrentStage('LISTENING');
      } else {
        setCurrentStage('READING');
        if (data.passageText) setLeftTab('passage');
      }

      const savedDraft = localStorage.getItem(storageKey);
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
          handleAutoSubmit(); // Tự động thu bài khi hết giờ
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
          {/* Header Bảng Điểm Cá Nhân */}
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

          {/* Cards Điểm Band Score */}
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

            {/* Nhận xét giáo viên nếu có */}
            {resultRecord.feedback && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs">
                <span className="font-bold text-amber-900 block mb-1">💬 Nhận xét từ Giáo viên / Giám khảo:</span>
                <p className="text-amber-800 font-medium leading-relaxed">{resultRecord.feedback}</p>
              </div>
            )}

            {/* Nút Xem lại bài làm chi tiết nếu cho phép */}
            {resultRecord.allowReview && resultRecord.reviewDetails && (
              <div className="space-y-4 pt-2">
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{showReview ? '🔼 Ẩn chi tiết bài làm' : '🔽 Xem lại chi tiết từng câu hỏi & đáp án'}</span>
                </button>

                {showReview && (
                  <div className="max-h-96 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                    {resultRecord.reviewDetails.map((q) => (
                      <div
                        key={`${q.skill}_${q.questionNumber}`}
                        className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          q.isCorrect ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-rose-50/60 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-black">
                          <span>
                            Câu {q.questionNumber} ({q.skill}): {q.questionText || ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] ${
                              q.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {q.isCorrect ? '✓ Đúng' : '✗ Sai'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 text-xs font-medium gap-1 pt-1">
                          <p>
                            Câu trả lời của bạn:{' '}
                            <strong className={q.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                              {q.studentAnswer || '(Bỏ trống)'}
                            </strong>
                          </p>
                          <p>
                            Đáp án đúng: <strong className="text-slate-800">{q.correctAnswer}</strong>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => navigate('/booking')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Quay lại Trang Đặt Lịch & Sự Kiện
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 3: PHÒNG CHỜ (EARLY) - ĐẾM NGƯỢC TỚI GIỜ MỞ ĐỀ ---
  if (accessStatus?.status === 'EARLY') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full bg-slate-800/90 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-4xl">
            ⏳
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              PHÒNG CHỜ THI ONLINE
            </span>
            <h1 className="text-xl md:text-2xl font-black mt-3 text-white">{accessStatus.eventTitle}</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">{accessStatus.shiftName}</p>
          </div>

          {/* Đồng hồ đếm ngược lớn */}
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-6 shadow-inner">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-2">
              Đề thi sẽ mở sau:
            </span>
            <span className="font-mono text-4xl md:text-5xl font-black text-amber-400 tracking-wider">
              {formatSeconds(secondsUntilStart)}
            </span>
          </div>

          <div className="text-left bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-1.5 font-medium">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>📋</span> Quy chế mở đề thi:
            </p>
            <p>• Khung giờ mở đề kéo dài <strong>1 tiếng</strong> tính từ lúc bắt đầu.</p>
            <p>• Thời gian làm bài <strong>({accessStatus.durationMinutes} phút)</strong> chỉ bắt đầu đếm ngược khi bạn bấm "Bắt đầu làm bài".</p>
            <p>• Hệ thống sẽ tự động chuyển sang trang mở đề ngay khi đồng hồ điểm 00:00:00.</p>
          </div>

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

  // --- RENDER 4: CỬA SỔ MỞ ĐỀ (OPEN_WINDOW) - CHỜ HỌC VIÊN BẤM BẮT ĐẦU ---
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
            <p>• Cổng mở đề sẽ đóng sau 1 tiếng. Bạn đang nằm trong khung giờ hợp lệ để làm bài.</p>
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
            Khung giờ mở đề thi đã khép lại sau 1 tiếng kể từ thời điểm bắt đầu ca thi. Bạn không thể mở bài thi mới được nữa.
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
        <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 p-8 text-center space-y-4 shadow-sm">
          <span className="text-5xl">⌛</span>
          <h2 className="text-base font-black text-amber-800">Thời gian làm bài đã kết thúc</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Phiên làm bài của ca thi này đã kết thúc do đã vượt quá thời gian quy định ({accessStatus.durationMinutes || 120} phút).
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/booking')}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
            >
              Quay lại Lịch Thi & Đặt Chỗ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 7: PHÒNG THI ONLINE (IN_PROGRESS) - FALLBACK NẾU CHƯA CÓ EXAM DATA ---
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

  const isWarningTime = timeLeft <= 300; // Còn dưới 5 phút
  const isBoth = examData.skillType === 'BOTH';
  const activeSkill = isBoth ? currentStage : examData.skillType;
  const currentSkillQuestions = examData.questions.filter((q) => q.skill === activeSkill);

  // Đếm số câu đã làm trong kỹ năng hiện tại
  let currentSkillAnsweredCount = 0;
  currentSkillQuestions.forEach((q) => {
    const k1 = `${q.skill}_${q.questionNumber}`;
    const k2 = String(q.questionNumber);
    if (answers[k1] || answers[k2]) currentSkillAnsweredCount++;
  });

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-100 text-slate-800">
      {/* HEADER PHÒNG THI TRỰC TUYẾN - TỐI ƯU RESPONSIVE MOBILE & DESKTOP */}
      <header className="h-16 bg-white shadow-xs flex items-center justify-between px-3 md:px-6 z-20 shrink-0 border-b border-slate-200/80">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => {
              if (window.confirm('Thoát phòng thi? Đồng hồ vẫn sẽ tiếp tục chạy theo thời gian thực!')) {
                navigate('/booking');
              }
            }}
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer shrink-0"
            title="Rời phòng thi"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
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

        {/* Đồng hồ đếm ngược & Nút nộp bài theo từng giai đoạn */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl font-mono text-xs md:text-sm font-black shadow-xs border transition-all ${
              isWarningTime
                ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <span>⏱️</span>
            <span>{formatSeconds(timeLeft)}</span>
          </div>

          {/* Nút hành động: Nếu đang thi Listening ở kỳ thi BOTH -> Nộp Listening & Sang Reading */}
          {isBoth && currentStage === 'LISTENING' ? (
            <button
              onClick={handleCompleteListeningAndSwitchToReading}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Nộp Listening & Sang Reading</span>
              <span className="sm:hidden">Sang Reading</span>
              <span>➔</span>
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🎓</span>
              <span>
                {submitting ? 'Đang nộp...' : isBoth ? (
                  <>
                    <span className="hidden sm:inline">Nộp Toàn Bộ Bài Thi</span>
                    <span className="sm:hidden">Nộp Bài</span>
                  </>
                ) : 'Nộp Bài'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* SEGMENTED TAB SWITCHER CHO MOBILE & TABLET (< MD) */}
      <div className="md:hidden flex items-center bg-white border-b border-slate-200 px-3 py-2 gap-2 shrink-0 z-10 shadow-xs">
        <button
          onClick={() => setMobileTab('content')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'content'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>{activeSkill === 'LISTENING' ? '🎧 Bài Nghe (Audio)' : '📄 Bài Đọc (PDF)'}</span>
        </button>
        <button
          onClick={() => setMobileTab('questions')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'questions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>📝 Phiếu Trả Lời</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            mobileTab === 'questions' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            {currentSkillAnsweredCount}/{currentSkillQuestions.length}
          </span>
        </button>
      </div>

      {/* WORKSPACE CHIA ĐÔI MÀN HÌNH (DESKTOP: SPLIT SCREEN 50-50, MOBILE: CHUYỂN TAB MƯỢT MÀ) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative p-2 md:p-4 gap-2 md:gap-4">
        {/* CỘT TRÁI: HIỂN THỊ THEO GIAI ĐOẠN HIỆN TẠI (LISTENING AUDIO HOẶC READING PASSAGE) */}
        <div className={`w-full md:w-1/2 h-full flex flex-col overflow-hidden relative ${
          mobileTab === 'content' ? 'flex' : 'hidden md:flex'
        }`}>
          {activeSkill === 'LISTENING' ? (
            /* GIAO DIỆN BÀI THI LISTENING */
            <div className="w-full h-full bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 p-4 md:p-6 flex flex-col justify-between shadow-xs overflow-y-auto custom-scrollbar">
              <div className="space-y-4 md:space-y-5">
                <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 md:p-3 bg-purple-100 text-purple-700 rounded-2xl text-xl md:text-2xl font-black">🎧</span>
                    <div>
                      <h3 className="text-sm md:text-base font-black text-slate-900">IELTS Academic Listening</h3>
                      <p className="text-[11px] md:text-xs text-slate-400 font-medium">Phần thi Nghe: 40 câu hỏi (Giai đoạn 1/2)</p>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-xs font-black px-2.5 md:px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                    Đang làm bài
                  </span>
                </div>

                {/* Khung Audio Player chuyên nghiệp chuẩn thi máy */}
                <div className="p-4 md:p-6 bg-gradient-to-br from-purple-50/80 via-indigo-50/60 to-blue-50/80 rounded-2xl border border-purple-200/70 space-y-3 md:space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="animate-pulse">🔊</span> Bản Ghi Âm Bài Thi (Official Audio)
                    </span>
                    <span className="text-[10px] font-bold bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded-full">
                      IELTS Audio
                    </span>
                  </div>

                  <audio
                    controls
                    autoPlay
                    className="w-full h-11 md:h-12 rounded-xl outline-none"
                    src={examData.audioUrl || '/sample-ielts-listening.wav'}
                  >
                    Trình duyệt của bạn không hỗ trợ phát âm thanh.
                  </audio>

                  <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
                    💡 Hãy đeo tai nghe và điều chỉnh âm lượng vừa nghe. Thí sinh có thể nghe và điền đáp án trực tiếp vào phiếu câu hỏi.
                  </p>
                </div>

                {/* Hướng dẫn làm bài */}
                <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
                  <h4 className="font-black text-slate-800 flex items-center gap-1.5">
                    <span>📋</span> Hướng Dẫn Thí Sinh:
                  </h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-600 leading-relaxed font-medium text-[11px] md:text-xs">
                    <li>Bạn có 40 câu hỏi ở phiếu làm bài.</li>
                    <li>Lắng nghe đoạn ghi âm và điền đáp án trực tiếp vào ô câu trả lời tương ứng.</li>
                    <li>Sau khi hoàn thành phần Listening, bấm nút <strong className="text-purple-700">"Nộp Listening & Sang Reading ➔"</strong> ở góc trên bên phải để bước vào phần thi Đọc.</li>
                    <li><strong className="text-rose-600">Lưu ý:</strong> Sau khi nộp Listening để chuyển sang Reading, bạn sẽ không thể quay lại sửa bài Listening.</li>
                  </ul>
                </div>
              </div>

              {isBoth && (
                <div className="pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px]">Tiến độ: Giai đoạn 1 (Listening) → Giai đoạn 2 (Reading)</span>
                  <button
                    onClick={handleCompleteListeningAndSwitchToReading}
                    className="font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer text-xs"
                  >
                    Bỏ qua sang Reading ➔
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* GIAO DIỆN BÀI THI READING (CÓ HIGHLIGHT) */
            <>
              {examData.passageText && examData.pdfUrl && (
                <div className="flex items-center gap-2 mb-2 shrink-0">
                  <button
                    onClick={() => setLeftTab('passage')}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      leftTab === 'passage'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    🖍️ Bài Đọc (Có Highlight)
                  </button>
                  <button
                    onClick={() => setLeftTab('pdf')}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      leftTab === 'pdf'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    📄 File PDF Đề Thi
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                {leftTab === 'passage' && examData.passageText ? (
                  <TextHighlightViewer content={examData.passageText} title="IELTS Academic Reading Passages" />
                ) : examData.pdfUrl ? (
                  <div className="w-full h-full bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col">
                    <InteractivePdfViewer
                      pdfUrl={examData.pdfUrl}
                      storageKey={`event_pdf_hl_${shiftIdNum}`}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-white rounded-2xl md:rounded-3xl border border-slate-200 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <span className="text-5xl mb-2">📄</span>
                    <p className="text-xs font-bold text-slate-600">Đề thi không đính kèm file PDF hoặc văn bản bài đọc.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Vui lòng đọc các câu hỏi ở phiếu làm bài.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Nút Floating trên Mobile để nhanh chóng chuyển sang điền đáp án */}
          <div className="md:hidden pt-2 shrink-0">
            <button
              onClick={() => setMobileTab('questions')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📝 Điền đáp án ({currentSkillAnsweredCount}/{currentSkillQuestions.length} câu)</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: PHIẾU TRẢ LỜI CÂU HỎI (ANSWER SHEET) */}
        <div className={`w-full md:w-1/2 h-full flex flex-col bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs ${
          mobileTab === 'questions' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Header Phiếu Trả Lời: Hiển thị đúng giai đoạn hiện tại */}
          <div className="px-4 md:px-5 py-2.5 md:py-3 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {isBoth ? (
                <span className={`px-2 md:px-2.5 py-1 rounded-lg text-[11px] md:text-xs font-black uppercase tracking-wider ${
                  currentStage === 'LISTENING' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {currentStage === 'LISTENING' ? '🎧 Phiếu Listening' : '📖 Phiếu Reading'}
                </span>
              ) : (
                <span className="text-xs font-black uppercase tracking-wider">
                  Phiếu Trả Lời ({activeSkill})
                </span>
              )}
              {isBoth && currentStage === 'READING' && (
                <span className="text-[9px] md:text-[10px] text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                  ✓ Đã nộp Listening
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-bold hidden lg:inline-flex items-center gap-1" title="Bôi đen văn bản câu hỏi và bấm Highlight hoặc nhấn Ctrl+H">
                <span>🖍️</span>
                <span>Highlight (Ctrl+H)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Đã làm: <strong className="text-white">{currentSkillAnsweredCount}</strong>/{currentSkillQuestions.length}
              </span>
              <span className="text-[9px] md:text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">
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

          {/* Quick Navigator Bar (40 số câu hỏi) */}
          <div className="p-2 md:p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
            {currentSkillQuestions.map((q) => {
              const answerKey = `${q.skill}_${q.questionNumber}`;
              const isFilled = !!answers[answerKey] || !!answers[String(q.questionNumber)];
              const isActive = activeQuestionNum === q.questionNumber;
              return (
                <button
                  key={answerKey}
                  onClick={() => {
                    setActiveQuestionNum(q.questionNumber);
                    const el = document.getElementById(`q_box_${answerKey}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg text-[10px] md:text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm scale-105'
                      : isFilled
                      ? 'bg-blue-100 text-blue-800 font-extrabold border border-blue-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                  }`}
                  title={`Câu ${q.questionNumber}: ${isFilled ? 'Đã điền' : 'Chưa điền'}`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>

          {/* Danh sách các câu hỏi để điền đáp án */}
          <div
            ref={questionSheetRef}
            onMouseUp={handleQuestionMouseUp}
            onClick={handleQuestionSheetClick}
            className="flex-1 p-3 md:p-5 overflow-y-auto custom-scrollbar space-y-3 md:space-y-4 bg-slate-50/50 relative select-text"
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
                return (
                  <div
                    key={answerKey}
                    id={`q_box_${answerKey}`}
                    onClick={() => setActiveQuestionNum(q.questionNumber)}
                    className={`p-3.5 md:p-4 bg-white rounded-2xl border transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 ${
                      isActive ? 'border-blue-500 shadow-sm' : 'border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-start gap-1.5 leading-relaxed">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                          {q.questionNumber}
                        </span>
                        <span>{q.questionText || `Câu ${q.questionNumber}`}</span>
                      </span>
                    </div>

                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Nhập câu trả lời của bạn..."
                        value={val}
                        onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                        onFocus={() => setActiveQuestionNum(q.questionNumber)}
                        className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all uppercase placeholder:normal-case placeholder:font-normal"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Nút quay lại xem bài đọc / audio trên Mobile */}
          <div className="md:hidden p-3 bg-white border-t border-slate-200 shrink-0">
            <button
              onClick={() => setMobileTab('content')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>←</span>
              <span>Quay lại xem {activeSkill === 'LISTENING' ? 'Audio Bài Nghe' : 'Đề Bài & PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
