import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockTestService } from '../../services/mockTestService';
import { streakService } from '../../services/streakService';
import InteractivePdfViewer from '../../components/InteractivePdfViewer';

const MockTestSplitScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const testId = Number(id);

  // ⚡ Lấy cờ kiểm tra xem bài thi này có kích hoạt từ Streak không
  const [searchParams] = useSearchParams();
  const isFromStreak = searchParams.get('fromStreak') === 'true';

  // Responsive Mobile Tab Switcher (< md)
  const [mobileTab, setMobileTab] = useState<'content' | 'questions'>('content');
  const [activeQuestionNum, setActiveQuestionNum] = useState<number | null>(null);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questionTexts, setQuestionTexts] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultRecord, setResultRecord] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); 

  const [testDetails, setTestDetails] = useState({
    title: "Đang tải...", type: "READING", pdf_url: "", audio_url: ""
  });

  // State cho Form Trích xuất từ vựng Reading (Bước 2)
  const [vocabList, setVocabList] = useState<{ englishWord: string; vietnameseMeaning: string }[]>([
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' }
  ]);
  const [vocabSaved, setVocabSaved] = useState(false);
  const [isSavingVocab, setIsSavingVocab] = useState(false);
  const [hasNoQuestions, setHasNoQuestions] = useState(false);

  // Keys cho LocalStorage Auto-Save & PDF Highlights
  const storageKey = `mocktest_draft_${testId}`;
  const pdfHighlightKey = `mocktest_pdf_hl_${testId}`;

  // Ref & State cho Floating Highlight Menu trên câu hỏi (Ctrl+H)
  const questionSheetRef = useRef<HTMLDivElement>(null);
  const [questionFloatingMenu, setQuestionFloatingMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Tải dữ liệu đề thi & khôi phục bản nháp
  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const service = mockTestService as any;
        const data: any = await service.getTestById(testId);
        setTestDetails({
          title: data.title, 
          type: data.type, 
          pdf_url: data.pdfUrl || data.pdf_url || "", 
          audio_url: data.audioUrl || data.audio_url || ""
        });

        const qRes: any = await service.getQuestionsForStudent(testId);
        const qData = Array.isArray(qRes) ? qRes : qRes.data || [];
        const qMap: Record<number, string> = {};
        qData.forEach((q: any) => {
            qMap[q.questionNumber || q.question_number] = q.questionText || q.question_text || '';
        });
        setQuestionTexts(qMap);
        setHasNoQuestions(qData.length === 0);

        // Khôi phục câu trả lời từ localStorage nếu có
        try {
          const savedDraft = localStorage.getItem(storageKey);
          if (savedDraft) {
            setAnswers(JSON.parse(savedDraft));
          }
        } catch (e) {
          console.warn('Lỗi khôi phục bản nháp câu trả lời:', e);
        }

      } catch (error) {
        console.error("Lỗi lấy thông tin đề thi", error);
      }
    };
    fetchTestDetails();
  }, [testId, storageKey]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (timeLeft <= 0 || resultRecord) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, resultRecord]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionNumber: number, value: string) => {
    if (resultRecord) return;
    const updated = { ...answers, [questionNumber]: value };
    setAnswers(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // --- FLOATING HIGHLIGHT CHO CÂU HỎI TRẮC NGHIỆM ---
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

  // ⚡ XỬ LÝ NỘP BÀI THI MOCK TEST
  const handleSubmit = async () => {
    const answeredCount = Object.values(answers).filter(v => v && v.trim() !== '').length;
    if (answeredCount === 0) return alert("Bạn chưa điền đáp án nào!");
    if (!window.confirm(`Bạn đã trả lời ${answeredCount}/40 câu. Xác nhận nộp bài?`)) return;

    setIsLoading(true);
    try {
      const durationSeconds = 3600 - timeLeft;
      const response: any = await mockTestService.submitTest(testId, answers, durationSeconds);
      const submittedRecord = response?.data || response;
      setResultRecord(submittedRecord);

      // Xóa bản nháp sau khi nộp thành công
      localStorage.removeItem(storageKey);
      localStorage.removeItem(pdfHighlightKey);

      // ⚡ PHÂN LUỒNG XỬ LÝ THEO LOẠI BÀI THI KHI TỚI TỪ STREAK:
      if (isFromStreak) {
        if (testDetails.type === 'READING') {
          // BÀI READING: Tiếp tục sang Bước 2 (Trích xuất 5-10 từ vựng).
        } else {
          // BÀI LISTENING: Hoàn thành Streak ngay lập tức
          try {
            await streakService.getTodayStreak();
          } catch (streakErr) {
            console.error("Lỗi cập nhật Streak Listening:", streakErr);
          }
        }
      }

    } catch (error: any) {
      console.error("Lỗi nộp bài:", error);
      const msg = error?.response?.data?.message || error?.message || "Lỗi nộp bài!";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quản lý nhập từ vựng Reading (Bước 2)
  const handleAddVocabRow = () => {
    if (vocabList.length < 10) {
      setVocabList([...vocabList, { englishWord: '', vietnameseMeaning: '' }]);
    }
  };

  const handleRemoveVocabRow = (index: number) => {
    if (vocabList.length > 5) {
      setVocabList(vocabList.filter((_, i) => i !== index));
    }
  };

  const handleVocabChange = (index: number, field: 'englishWord' | 'vietnameseMeaning', value: string) => {
    const updated = [...vocabList];
    updated[index][field] = value;
    setVocabList(updated);
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledVocab = vocabList.filter(
      v => v.englishWord.trim() !== '' && v.vietnameseMeaning.trim() !== ''
    );

    if (filledVocab.length < 5) {
      return alert("Vui lòng điền tối thiểu 5 từ vựng chưa biết trong bài!");
    }

    if (filledVocab.length > 10) {
      return alert("Tối đa chỉ được chọn 10 từ vựng!");
    }

    setIsSavingVocab(true);
    try {
      await mockTestService.saveExtractedVocabularies(testId, filledVocab);
      setVocabSaved(true);

      // ⚡ NẾU TỚI TỪ STREAK: Chuyển tiếp sang màn hình ôn tập từ vựng
      if (isFromStreak) {
        navigate(`/vocab-review/${testId}`);
      }
    } catch (error) {
      alert("Lỗi khi lưu danh sách từ vựng!");
    } finally {
      setIsSavingVocab(false);
    }
  };

  const isWarningTime = timeLeft <= 300;
  const answeredCount = Object.values(answers).filter(v => v && v.trim() !== '').length;

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-100 text-slate-800">
      
      {/* HEADER PHÒNG THI MOCK TEST */}
      <header className="h-16 bg-white shadow-xs flex items-center justify-between px-3 md:px-6 z-20 shrink-0 border-b border-slate-200/80">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button 
            onClick={() => {
              if (resultRecord || window.confirm("Thoát bài thi sẽ hủy toàn bộ tiến trình làm bài?")) {
                navigate('/mock-test');
              }
            }} 
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer shrink-0"
            title="Quay lại danh sách đề thi"
          >
             ←
          </button>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
              {testDetails.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                testDetails.type === 'READING' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                  : 'bg-purple-50 text-purple-700 border border-purple-200/60'
              }`}>
                MODULE {testDetails.type}
              </span>
              {isFromStreak && (
                <span className="text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  ⚡ Streak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Đồng hồ đếm ngược & Nút nộp bài */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl font-mono text-xs md:text-sm font-black shadow-xs border transition-all ${
            isWarningTime 
              ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            <span>⏱️</span>
            <span>{formatTime(timeLeft)}</span>
          </div>

          {!resultRecord && (
            <button
              onClick={handleSubmit}
              disabled={isLoading || hasNoQuestions}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                isWarningTime
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              <span>🎓</span>
              <span>
                {isLoading ? 'Đang nộp...' : 'Nộp Bài'}
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
          <span>{testDetails.type === 'LISTENING' ? '🎧 Đề Nghe & PDF' : '📄 Đề Thi (PDF)'}</span>
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
            {answeredCount}/40
          </span>
        </button>
      </div>

      {/* VÙNG CHIA ĐÔI MÀN HÌNH WORKSPACE (SPLIT SCREEN) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative p-2 md:p-4 gap-2 md:gap-4">
        
        {/* CỘT TRÁI: ĐỀ THI PDF (VÀ AUDIO PLAYER NẾU LÀ ĐỀ LISTENING) */}
        <div className={`w-full md:w-1/2 h-full flex flex-col overflow-hidden relative ${
          mobileTab === 'content' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* NẾU LÀ ĐỀ LISTENING: HIỂN THỊ THANH AUDIO CHUYÊN NGHIỆP TRÊN ĐẦU */}
          {testDetails.type === 'LISTENING' && (
            <div className="mb-2 p-3 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl border border-purple-800/60 shadow-xs shrink-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm">🎧</span>
                  <div>
                    <h4 className="text-xs font-black tracking-wide flex items-center gap-1.5">
                      <span>Bản Ghi Âm IELTS Listening</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </h4>
                    <p className="text-[10px] text-purple-200 font-medium hidden sm:block">
                      Đeo tai nghe và vừa nghe vừa theo dõi đề thi PDF bên dưới
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-purple-700/60 text-purple-200 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Official Audio
                </span>
              </div>

              <audio
                controls
                autoPlay
                className="w-full h-8 md:h-9 rounded-lg outline-none"
                src={testDetails.audio_url || '/sample-ielts-listening.wav'}
              >
                Trình duyệt của bạn không hỗ trợ phát âm thanh.
              </audio>
            </div>
          )}

          {/* BỘ ĐỌC PDF ĐỀ THI CHO CẢ READING LẪN LISTENING */}
          <div className="flex-1 w-full bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col min-h-0">
            {testDetails.pdf_url ? (
              <InteractivePdfViewer
                pdfUrl={testDetails.pdf_url}
                storageKey={pdfHighlightKey}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white space-y-2">
                <span className="text-4xl opacity-50">📄</span>
                <h2 className="text-sm font-bold text-slate-800">Chưa có File PDF Đề thi</h2>
                <p className="text-xs text-slate-400 max-w-xs">Giáo viên chưa đính kèm link PDF xem đề bài cho bài thi này.</p>
              </div>
            )}
          </div>

          {/* Nút Floating trên Mobile để nhanh chóng chuyển sang điền đáp án */}
          <div className="md:hidden pt-2 shrink-0">
            <button
              onClick={() => setMobileTab('questions')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📝 Điền đáp án ({answeredCount}/40 câu)</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: PHIẾU LÀM BÀI HOẶC BƯỚC 2 TRÍCH XUẤT TỪ VỰNG HOẶC BƯỚC 3 BẢNG ĐIỂM */}
        <div className={`w-full md:w-1/2 h-full flex flex-col bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs ${
          mobileTab === 'questions' ? 'flex' : 'hidden md:flex'
        }`}>
           
           {/* BƯỚC 1: LÀM BÀI MOCK TEST */}
           {!resultRecord ? (
             <>
               {/* Header Phiếu Trả Lời */}
               <div className="px-4 md:px-5 py-2.5 md:py-3 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
                 <div className="flex items-center gap-2">
                   <span className={`px-2 md:px-2.5 py-1 rounded-lg text-[11px] md:text-xs font-black uppercase tracking-wider ${
                     testDetails.type === 'READING' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                   }`}>
                     {testDetails.type === 'READING' ? '📖 Phiếu Reading' : '🎧 Phiếu Listening'}
                   </span>
                 </div>

                 <div className="flex items-center gap-1.5 md:gap-2">
                   <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-bold hidden lg:inline-flex items-center gap-1" title="Bôi đen văn bản câu hỏi và bấm Highlight hoặc nhấn Ctrl+H">
                     <span>🖍️</span>
                     <span>Highlight (Ctrl+H)</span>
                   </span>
                   <span className="text-[11px] font-mono text-slate-300">
                     Đã làm: <strong className="text-white">{answeredCount}</strong>/40
                   </span>
                   <span className="text-[9px] md:text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">
                     Auto-Saved
                   </span>
                 </div>
               </div>

               {/* Quick Navigator Bar (40 số câu hỏi dạng button pill) */}
               <div className="p-2 md:p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                 {[...Array(40)].map((_, i) => {
                   const num = i + 1;
                   const isFilled = !!answers[num];
                   const isActive = activeQuestionNum === num;
                   return (
                     <button
                       key={num}
                       onClick={() => {
                         setActiveQuestionNum(num);
                         const el = document.getElementById(`q_box_${num}`);
                         el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                       }}
                       className={`w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg text-[10px] md:text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                         isActive
                           ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm scale-105'
                           : isFilled
                           ? 'bg-blue-100 text-blue-800 font-extrabold border border-blue-300'
                           : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                       }`}
                       title={`Câu ${num}: ${isFilled ? 'Đã điền' : 'Chưa điền'}`}
                     >
                       {num}
                     </button>
                   );
                 })}
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

               {hasNoQuestions && (
                 <div className="p-3.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shrink-0">
                   <span className="text-base leading-none">⚠️</span>
                   <div>
                     <p className="font-bold">Đề thi này chưa có đáp án trên hệ thống.</p>
                     <p className="text-[11px] text-amber-700 mt-0.5 leading-normal">
                       Giáo viên chưa cấu hình câu hỏi và đáp án cho đề này. Bạn vẫn có thể đọc đề để tự luyện tập, nhưng hệ thống sẽ không thể chấm điểm cho tới khi giáo viên cập nhật đáp án.
                     </p>
                   </div>
                 </div>
               )}
               
               {/* Danh sách 40 câu hỏi */}
               <div 
                 ref={questionSheetRef}
                 onMouseUp={handleQuestionMouseUp}
                 onClick={handleQuestionSheetClick}
                 className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-3.5 custom-scrollbar bg-slate-50/50 select-text"
               >
                  {[...Array(40)].map((_, i) => {
                    const num = i + 1;
                    const qText = questionTexts[num];
                    const currentVal = answers[num] || '';
                    const isActive = activeQuestionNum === num;
                    
                    return (
                      <div 
                        key={num} 
                        id={`q_box_${num}`}
                        onClick={() => setActiveQuestionNum(num)}
                        className={`p-3 md:p-3.5 rounded-2xl border transition-all space-y-2 bg-white ${
                          isActive 
                            ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                            : currentVal 
                            ? 'border-blue-300 bg-blue-50/20' 
                            : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {qText && (
                          <p className="text-xs text-slate-700 font-bold leading-relaxed border-l-2 border-blue-500 pl-3 bg-blue-50/40 py-1.5 rounded-r-xl">
                            {qText}
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center font-black text-xs rounded-xl shrink-0 transition-colors ${
                            currentVal ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {num}
                          </div>
                          <input 
                            type="text" 
                            placeholder="Nhập đáp án..."
                            value={currentVal}
                            disabled={hasNoQuestions}
                            onChange={(e) => handleAnswerChange(num, e.target.value)}
                            onFocus={() => setActiveQuestionNum(num)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-all uppercase font-bold text-slate-800 disabled:opacity-50 placeholder:normal-case placeholder:font-normal"
                          />
                        </div>
                      </div>
                    );
                  })}
               </div>

               {/* Nút nộp bài */}
               <div className="p-3 md:p-4 bg-slate-50/90 border-t border-slate-100 shrink-0">
                  <button 
                    onClick={handleSubmit} 
                    disabled={isLoading || hasNoQuestions} 
                    className={`w-full font-black py-3 md:py-3.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 active:scale-98 ${
                      hasNoQuestions
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer'
                    }`}
                  >
                    <span>🎓</span>
                    <span>
                      {hasNoQuestions ? "Đề thi chưa có đáp án trên hệ thống" : isLoading ? "Đang chấm điểm bài thi..." : `Nộp Bài Lấy Điểm (${answeredCount}/40 câu)`}
                    </span>
                  </button>
               </div>

               {/* Nút quay lại xem bài đọc / audio trên Mobile */}
               <div className="md:hidden p-3 bg-white border-t border-slate-200 shrink-0">
                 <button
                   onClick={() => setMobileTab('content')}
                   className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                 >
                   <span>←</span>
                   <span>Quay lại xem {testDetails.type === 'LISTENING' ? 'Audio & Đề PDF' : 'Đề Bài & PDF'}</span>
                 </button>
               </div>
             </>
           ) : testDetails.type === 'READING' && !vocabSaved ? (
             
             /* BƯỚC 2: YÊU CẦU NHẬP TỪ 5 ĐẾN 10 TỪ VỰNG (CHỈ ÁP DỤNG BÀI READING) */
             <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-5 animate-[fadeIn_0.3s_ease-out]">
               <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-y-1">
                 <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                   <span>📝</span> Trích Xuất Từ Vựng Đề Reading
                 </h3>
                 <p className="text-xs text-amber-800 font-medium leading-relaxed">
                   Nhập tối thiểu <span className="font-extrabold underline">5 từ</span> và tối đa <span className="font-extrabold underline">10 từ</span> bạn chưa biết nghĩa trong bài để ôn tập ở lần test sau.
                 </p>
               </div>

               <form onSubmit={handleSaveVocab} className="space-y-3 flex-1 flex flex-col justify-between">
                 <div className="space-y-2.5">
                   {vocabList.map((row, idx) => (
                     <div key={idx} className="flex items-center gap-2">
                       <span className="w-6 font-black text-xs text-slate-400 text-center">{idx + 1}.</span>
                       <input
                         type="text"
                         placeholder="Từ Tiếng Anh..."
                         value={row.englishWord}
                         onChange={(e) => handleVocabChange(idx, 'englishWord', e.target.value)}
                         className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 outline-none focus:border-blue-600 focus:bg-white"
                       />
                       <input
                         type="text"
                         placeholder="Nghĩa Tiếng Việt..."
                         value={row.vietnameseMeaning}
                         onChange={(e) => handleVocabChange(idx, 'vietnameseMeaning', e.target.value)}
                         className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:border-emerald-600 focus:bg-white"
                       />
                       {vocabList.length > 5 && (
                         <button
                           type="button"
                           onClick={() => handleRemoveVocabRow(idx)}
                           className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                         >
                           ✕
                         </button>
                       )}
                     </div>
                   ))}

                   {vocabList.length < 10 && (
                     <button
                       type="button"
                       onClick={handleAddVocabRow}
                       className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all border border-dashed border-slate-300 cursor-pointer"
                     >
                       + Thêm Từ Vựng ({vocabList.length}/10)
                     </button>
                   )}
                 </div>

                 <button
                   type="submit"
                   disabled={isSavingVocab}
                   className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all mt-4 cursor-pointer active:scale-98"
                 >
                   {isSavingVocab ? "Đang lưu..." : isFromStreak ? "Lưu Từ Vựng & Bắt Đầu Ôn Tập Streak ➔" : "Hoàn Tất & Lưu Từ Vựng ➔"}
                 </button>
               </form>
             </div>

           ) : (

             /* BƯỚC 3: MÀN HÌNH TỔNG KẾT BẢNG ĐIỂM HOÀN THÀNH */
             <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center overflow-y-auto animate-[fadeIn_0.3s_ease-out] space-y-6">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-inner">
                 🎉
               </div>
               <div>
                 <h2 className="text-xl md:text-2xl font-black text-slate-900">Hoàn Thành Bài Thi!</h2>
                 <p className="text-slate-400 text-xs font-semibold mt-1">Kết quả đã được ghi nhận vào hệ thống thống kê</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                 <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Độ chính xác</p>
                   <p className="text-3xl font-black text-emerald-700">{resultRecord.score?.toFixed(1) || 0}%</p>
                 </div>
                 <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4">
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Thời gian làm</p>
                   <p className="text-xl font-black text-blue-700 mt-1 font-mono">
                     {Math.floor((resultRecord.durationSeconds || 0) / 60)}m {(resultRecord.durationSeconds || 0) % 60}s
                   </p>
                 </div>
               </div>

               <button 
                 onClick={() => navigate('/dashboard')}
                 className="px-8 py-3.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-md hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
               >
                 ← Quay lại Trang Chủ
               </button>
             </div>
           )}

        </div>

      </div>

    </div>
  );
};

export default MockTestSplitScreen;
