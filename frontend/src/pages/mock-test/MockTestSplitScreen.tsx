import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mockTestService } from '../../services/mockTestService';
import { streakService } from '../../services/streakService';

const MockTestSplitScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const testId = Number(id);

  // ⚡ Lấy cờ kiểm tra xem bài thi này có kích hoạt từ Streak không
  const [searchParams] = useSearchParams();
  const isFromStreak = searchParams.get('fromStreak') === 'true';

  const [activeTab, setActiveTab] = useState<'pdf' | 'answers'>('pdf'); 
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questionTexts, setQuestionTexts] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultRecord, setResultRecord] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); 

  const [testDetails, setTestDetails] = useState({
    title: "Đang tải...", type: "READING", pdf_url: "", audio_url: ""
  });

  // State cho Form Trích xuất từ vựng Reading
  const [vocabList, setVocabList] = useState<{ englishWord: string; vietnameseMeaning: string }[]>([
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' },
    { englishWord: '', vietnameseMeaning: '' }
  ]);
  const [vocabSaved, setVocabSaved] = useState(false);
  const [isSavingVocab, setIsSavingVocab] = useState(false);

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const service = mockTestService as any;
        const data: any = await service.getTestById(testId);
        setTestDetails({
          title: data.title, 
          type: data.type, 
          pdf_url: data.pdfUrl || "", 
          audio_url: data.audioUrl || ""
        });

        const qRes: any = await service.getQuestionsForStudent(testId);
        const qData = Array.isArray(qRes) ? qRes : qRes.data || [];
        const qMap: Record<number, string> = {};
        qData.forEach((q: any) => {
            qMap[q.questionNumber || q.question_number] = q.questionText || q.question_text || '';
        });
        setQuestionTexts(qMap);

      } catch (error) {
        console.error("Lỗi lấy thông tin đề thi", error);
      }
    };
    fetchTestDetails();
  }, [testId]);

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
    setAnswers({ ...answers, [questionNumber]: value });
  };

  // ⚡ XỬ LÝ NỘP BÀI THI MOCK TEST
  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) return alert("Bạn chưa điền đáp án nào!");
    if (!window.confirm("Xác nhận nộp bài?")) return;

    setIsLoading(true);
    try {
      const durationSeconds = 3600 - timeLeft;
      const response: any = await mockTestService.submitTest(testId, answers, durationSeconds);
      const submittedRecord = response?.data || response;
      setResultRecord(submittedRecord);

      // ⚡ PHÂN LUỒNG XỬ LÝ THEO LOẠI BÀI THI KHI TỚI TỪ STREAK:
      if (isFromStreak) {
        if (testDetails.type === 'READING') {
          // ⚡ BÀI READING: Tự động chuyển tiếp sang làm 35 từ vựng review
          navigate(`/vocab-review/${testId}`);
        } else {
          // ⚡ BÀI LISTENING: Hoàn thành Streak ngay lập tức không cần qua review từ vựng
          try {
            await streakService.getTodayStreak();
          } catch (streakErr) {
            console.error("Lỗi cập nhật Streak Listening:", streakErr);
          }
        }
      }

    } catch (error) {
      alert("Lỗi nộp bài!");
    } finally {
      setIsLoading(false);
    }
  };

  // Quản lý nhập từ vựng Reading
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
    } catch (error) {
      alert("Lỗi khi lưu danh sách từ vựng!");
    } finally {
      setIsSavingVocab(false);
    }
  };

  const isWarningTime = timeLeft <= 300;

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-50 text-slate-800">
      
      {/* HEADER PHÒNG THI */}
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-20 shrink-0 border-b border-slate-200/80">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (resultRecord || window.confirm("Thoát bài thi sẽ hủy toàn bộ tiến trình làm bài?")) {
                navigate('/mock-test');
              }
            }} 
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
          >
             ←
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 line-clamp-1 max-w-xs md:max-w-md">{testDetails.title}</h1>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
              testDetails.type === 'READING' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              MODULE {testDetails.type}
            </span>
          </div>
        </div>

        {/* Thanh Audio cho đề Listening */}
        {testDetails.type === 'LISTENING' && testDetails.audio_url && (
          <div className="hidden md:flex items-center gap-2.5 bg-slate-100/80 px-3.5 py-1 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span>🎧</span> Audio:
            </span>
            <audio controls className="h-7 max-w-[240px]">
               <source src={testDetails.audio_url} type="audio/mpeg" />
            </audio>
          </div>
        )}

        {/* Đồng hồ đếm ngược */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-black shadow-sm border transition-all ${
          isWarningTime 
            ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          <span>⏱️</span>
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* VÙNG CHIA ĐÔI MÀN HÌNH WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Cột trái: PDF ĐỀ THI */}
        <div className={`w-full md:w-1/2 h-full p-3 md:p-4 transition-all duration-300 ${activeTab === 'pdf' ? 'block' : 'hidden md:block'}`}>
          <div className="w-full h-full bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col shadow-sm">
            <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 font-black text-slate-500 text-[11px] uppercase tracking-wider flex justify-between items-center">
              <span>📖 Đề Thi PDF Paper ({testDetails.type})</span>
              <span className="text-[10px] text-slate-400 font-semibold lowercase">Cuộn để đọc đề</span>
            </div>
            
            <div className="flex-1 bg-slate-100/60 relative">
              {testDetails.pdf_url ? (
                <iframe src={testDetails.pdf_url} className="w-full h-full border-none" title="Exam PDF Paper" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white space-y-2">
                  <span className="text-4xl opacity-50">📄</span>
                  <h2 className="text-sm font-bold text-slate-800">Chưa có File PDF Đề thi</h2>
                  <p className="text-xs text-slate-400 max-w-xs">Giáo viên chưa đính kèm link PDF xem đề bài cho bài thi này.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Phiếu làm bài OR Form Từ Vựng OR Bảng Điểm */}
        <div className={`w-full md:w-1/2 h-full p-3 md:p-4 transition-all duration-300 ${activeTab === 'answers' ? 'block' : 'hidden md:block'}`}>
          <div className="w-full h-full bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col shadow-sm">
             
             {/* BƯỚC 1: LÀM BÀI MOCK TEST */}
             {!resultRecord ? (
               <>
                 <div className="px-5 py-3 bg-blue-600 font-black text-white text-[11px] uppercase tracking-wider shadow-sm flex justify-between items-center">
                   <span>✍️ Phiếu Trả Lời (40 Câu)</span>
                   <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">Auto-Save</span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 custom-scrollbar">
                    {[...Array(40)].map((_, i) => {
                      const num = i + 1;
                      const qText = questionTexts[num];
                      const currentVal = answers[num] || '';
                      
                      return (
                        <div key={num} className={`p-3 rounded-2xl border transition-all space-y-2 ${
                          currentVal ? 'border-blue-300 bg-blue-50/10' : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}>
                          {qText && (
                            <p className="text-xs text-slate-700 font-bold leading-relaxed border-l-2 border-blue-500 pl-3 bg-blue-50/30 py-1.5 rounded-r-xl">
                              {qText}
                            </p>
                          )}
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 flex items-center justify-center font-black text-xs rounded-xl shrink-0 transition-colors ${
                              currentVal ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {num}
                            </div>
                            <input 
                              type="text" 
                              placeholder="Nhập đáp án..."
                              value={currentVal}
                              onChange={(e) => handleAnswerChange(num, e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-all uppercase font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      );
                    })}
                 </div>

                 <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                    <button 
                      onClick={handleSubmit} 
                      disabled={isLoading} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
                    >
                      {isLoading ? "Đang chấm điểm bài thi..." : "Nộp Bài Lấy Điểm"}
                    </button>
                 </div>
               </>
             ) : testDetails.type === 'READING' && !vocabSaved ? (
               
               /* BƯỚC 2: YÊU CẦU NHẬP TỪ 5 ĐẾN 10 TỪ VỰNG (CHỈ ÁP DỤNG BÀI READING) */
               <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar space-y-5 animate-[fadeIn_0.3s_ease-out]">
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
                           className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 outline-none focus:border-blue-600"
                         />
                         <input
                           type="text"
                           placeholder="Nghĩa Tiếng Việt..."
                           value={row.vietnameseMeaning}
                           onChange={(e) => handleVocabChange(idx, 'vietnameseMeaning', e.target.value)}
                           className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:border-emerald-600"
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
                         className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all border border-dashed border-slate-300 cursor-pointer"
                       >
                         + Thêm Từ Vựng ({vocabList.length}/10)
                       </button>
                     )}
                   </div>

                   <button
                     type="submit"
                     disabled={isSavingVocab}
                     className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all mt-4 cursor-pointer"
                   >
                     {isSavingVocab ? "Đang lưu..." : "Hoàn Tất & Lưu Từ Vựng ➔"}
                   </button>
                 </form>
               </div>

             ) : (

               /* BƯỚC 3: MÀN HÌNH TỔNG KẾT BẢNG ĐIỂM HOÀN THÀNH */
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto animate-[fadeIn_0.3s_ease-out] space-y-6">
                 <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-inner">
                   🎉
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-slate-900">Hoàn Thành Bài Thi!</h2>
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
                   className="px-8 py-3.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                 >
                   ← Quay lại Trang Chủ
                 </button>
               </div>
             )}

          </div>
        </div>

      </div>

      {/* NÚT CHUYỂN TABS CHO MOBILE */}
      <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-slate-200 flex gap-1 z-50 w-11/12 max-w-[280px]">
        <button 
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${activeTab === 'pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 bg-transparent'}`}
        >
          📖 Đọc Đề
        </button>
        <button 
          onClick={() => setActiveTab('answers')}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${activeTab === 'answers' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 bg-transparent'}`}
        >
          📝 Làm Bài
        </button>
      </div>

    </div>
  );
};

export default MockTestSplitScreen;