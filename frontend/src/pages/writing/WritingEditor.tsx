import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { writingService } from '../../services/writingService';
import { adminService } from '../../services/adminService';

const WritingEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streakPromptId = searchParams.get('streakPromptId');

  // States quản lý luồng
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  
  const [prompts, setPrompts] = useState<any[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<any | null>(null);
  const [completedPromptIds, setCompletedPromptIds] = useState<Set<number>>(new Set());

  const [text, setText] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // 1. LẤY DANH SÁCH TOPIC THEO LỚP VÀ NẠP LỊCH SỬ BÀI ĐÃ LÀM
  useEffect(() => {
    const fetchTopicsAndHistory = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); 
          return navigate('/dashboard');
        }

        // ⚡ Lấy mảng bài tập Writing đã hoàn thành của học viên
        const recordsRes: any = await adminService.getMyRecords();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'WRITING')
            .map((r: any) => r.refId)
        );
        setCompletedPromptIds(doneSet);

        const res: any = await writingService.getTopicsByClass(classId);
        const topicList = Array.isArray(res) ? res : res.data || [];
        setTopics(topicList);

        // ⚡ Tự động mở bài tập nếu tới từ nút Streak trên Dashboard
        if (streakPromptId) {
          const targetPromptId = Number(streakPromptId);
          try {
            const promptRes: any = await writingService.getPromptById(targetPromptId);
            const promptData = promptRes?.data || promptRes;
            if (promptData) {
              const matchedTopic = topicList.find((t: any) => t.id === (promptData.topicId || promptData.topic?.id));
              if (matchedTopic) {
                setSelectedTopic(matchedTopic);
                const pRes: any = await writingService.getPromptsByTopic(matchedTopic.id);
                setPrompts(Array.isArray(pRes) ? pRes : pRes.data || []);
              }
              handleStartPrompt(promptData);
              return;
            }
          } catch (e) {
            console.warn("Could not find prompt directly by ID:", e);
          }
        }
      } catch (error) {
        console.error("Lỗi nạp dữ liệu Writing:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopicsAndHistory();
  }, [navigate, streakPromptId]);

  // 2. KHI CHỌN TOPIC -> LẤY DANH SÁCH PROMPTS
  const handleSelectTopic = async (topic: any) => {
    setIsLoading(true);
    try {
      setSelectedTopic(topic);
      const res: any = await writingService.getPromptsByTopic(topic.id);
      setPrompts(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      alert("Lỗi tải bài tập!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPrompt = (prompt: any) => {
    setCurrentPrompt(prompt);
    setText('');
    setSubmitResult(null);
    setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    if (!text.trim()) return alert("Bạn chưa nhập nội dung bản dịch!");
    setIsLoading(true);
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const res: any = await writingService.submitWriting(currentPrompt.id, text, duration);
      setSubmitResult(res?.data || res);
      
      // ⚡ Tự động cập nhật ID bài vừa làm vào mảng DONE
      setCompletedPromptIds(prev => new Set(prev).add(currentPrompt.id));
    } catch (error) {
      alert("Lỗi nộp bài!");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Đang khởi tạo bài tập Writing...</span>
        </div>
      </div>
    );
  }

  // MÀN HÌNH 1: CHỌN TOPIC
  if (!selectedTopic) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all mr-4"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Writing Topics</h1>
            <p className="text-[11px] font-semibold text-slate-400">Chọn chủ đề bài tập dịch câu chuẩn ngữ pháp & từ khóa</p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {topics.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm space-y-2">
              <span className="text-4xl block">✍️</span>
              <p className="text-xs text-slate-500 font-bold">Giáo viên chưa cập nhật chủ đề Writing cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleSelectTopic(t)} 
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:border-rose-300 cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-rose-100">
                      ✍️
                    </div>
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                      Luyện dịch câu
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors">{t.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">Luyện viết câu chuẩn cấu trúc tiếng Anh</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
                    <span>Luyện tập ngay</span>
                    <span className="group-hover:translate-x-1 transition-transform">➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // MÀN HÌNH 2: CHỌN CÂU TRONG TOPIC (CÓ CỜ DONE)
  if (!currentPrompt) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedTopic(null)} 
              className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight">{selectedTopic.name}</h1>
              <span className="text-[10px] text-rose-600 font-black bg-rose-50 inline-block px-2.5 py-0.5 rounded-md mt-0.5 border border-rose-100/60">
                {prompts.length} Bài tập dịch
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto">
          {prompts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm">
              <p className="text-xs font-bold text-slate-400">Chủ đề này hiện chưa có câu hỏi nào.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {prompts.map((p, i) => {
                const isDone = completedPromptIds.has(p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => handleStartPrompt(p)} 
                    className={`p-5 rounded-3xl border shadow-sm cursor-pointer transition-all flex gap-4 items-start group active:scale-[0.99] ${
                      isDone 
                        ? 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-400' 
                        : 'bg-white border-slate-200/80 hover:border-rose-300 hover:shadow-md'
                    }`}
                  >
                    <div className="w-9 h-9 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border border-rose-100">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-1.5">
                       <div className="flex items-center justify-between gap-2">
                         <p className="text-slate-800 font-bold text-xs md:text-sm group-hover:text-rose-600 transition-colors">
                           "{p.vietnameseSentence || p.vietnamese_sentence}"
                         </p>

                         {/* ⚡ CỜ BADGE HIỂN THỊ DONE */}
                         {isDone && (
                           <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 shrink-0">
                             ✓ DONE
                           </span>
                         )}
                       </div>
                       <p className="text-[11px] text-slate-400 font-mono font-medium">
                         🔑 Keywords: <span className="text-slate-600 font-semibold">{p.keywords}</span>
                       </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // MÀN HÌNH 3: KẾT QUẢ CHẤM ĐIỂM
  if (submitResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200/80 max-w-lg w-full text-center animate-[fadeIn_0.3s_ease-out] space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
            🤖
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Kết Quả Đánh Giá</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Hệ thống đã phân tích bản dịch theo Từ khóa & Cấu trúc ngữ pháp</p>
          </div>
          
          <div className="p-4 bg-slate-50/80 rounded-2xl text-left border border-slate-200/80 space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đáp án mẫu chuẩn:</p>
             <p className="text-slate-800 font-bold text-xs md:text-sm leading-relaxed">{submitResult.englishAnswer || currentPrompt.englishAnswer || currentPrompt.english_answer}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Tổng điểm đạt được</p>
              <p className="text-3xl font-black text-emerald-700">{Math.round(submitResult.score || 0)}%</p>
            </div>
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Thời gian làm</p>
              <p className="text-2xl font-black text-blue-700 mt-1 font-mono">{submitResult.durationSeconds || 0}s</p>
            </div>
          </div>

          <button 
            onClick={() => setCurrentPrompt(null)} 
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all text-xs active:scale-95"
          >
            ← Quay Lại Danh Sách Bài Tập
          </button>
        </div>
      </div>
    );
  }

  // MÀN HÌNH 4: SOẠN THẢO BẢN DỊCH (EDITOR)
  const keywordsList = (currentPrompt.keywords || "").split(',').map((k: string) => k.trim());
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { if(window.confirm("Thoát bài làm sẽ không lưu lại bản dịch?")) setCurrentPrompt(null); }} 
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">{selectedTopic.name}</h1>
            <span className="text-[10px] text-rose-600 font-black bg-rose-50 inline-block px-2.5 py-0.5 rounded-md mt-0.5 border border-rose-100/60">
              Đang làm bài dịch
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col space-y-6">
          
          <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 space-y-5">
             <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center text-sm shrink-0 font-black border border-blue-100">
                  🇻🇳
                </div>
                <div>
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Câu gốc tiếng Việt cần dịch</h2>
                  <p className="text-base md:text-lg text-slate-900 font-extrabold leading-relaxed">
                    "{currentPrompt.vietnameseSentence || currentPrompt.vietnamese_sentence}"
                  </p>
                </div>
             </div>

             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Từ vựng bắt buộc phải sử dụng (Keywords):</p>
                <div className="flex flex-wrap gap-2">
                  {keywordsList.map((keyword: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-xl text-xs font-bold">
                      {keyword}
                    </span>
                  ))}
                </div>
             </div>
          </div>

          <div className="p-6 md:p-8 bg-white space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🇬🇧</span> Bản dịch tiếng Anh của bạn
            </h2>

            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Gõ bản dịch tiếng Anh hoàn chỉnh vào đây..."
              className="w-full min-h-[160px] bg-white border-2 border-slate-200 rounded-2xl p-4 text-slate-800 text-sm leading-relaxed focus:outline-none focus:border-rose-500 transition-all resize-none placeholder-slate-300 font-semibold"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl font-mono">
                Số từ: {wordCount}
              </div>

              <button 
                onClick={handleSubmit} 
                className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                Nộp Bài & Chấm Điểm
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default WritingEditor;