import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { writingService } from '../../services/writingService';

const WritingEditor = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<any | null>(null);
  const [text, setText] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<any>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); return navigate('/dashboard');
        }

        const res: any = await writingService.getPromptsByClass(classId);
        setPrompts(Array.isArray(res) ? res : res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, [navigate]);

  const handleStart = (prompt: any) => {
    setCurrentPrompt(prompt);
    setText('');
    setSubmitResult(null);
    setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    if (!text.trim()) return alert("Bạn chưa nhập nội dung!");
    setIsLoading(true);
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const res = await writingService.submitWriting(currentPrompt.id, text, duration);
      setSubmitResult(res);
    } catch (error) {
      alert("Lỗi nộp bài!");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="text-gray-500 font-bold">Đang xử lý...</span></div>;

  // MÀN HÌNH 1: CHỌN CÂU HỎI
  if (!currentPrompt) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all mr-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Writing Practice</h1>
            <p className="text-xs text-gray-500 font-medium">Luyện dịch câu sử dụng Keywords</p>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto">
          {prompts.length === 0 ? <p className="text-center text-gray-500">Chưa có bài tập nào.</p> : (
            <div className="space-y-4">
              {prompts.map((p, i) => (
                <div key={p.id} onClick={() => handleStart(p)} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 cursor-pointer transition-all flex gap-4 items-start">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-bold">{i + 1}</div>
                  <div className="flex-1">
                     <p className="text-gray-800 font-semibold mb-2">{p.vietnameseSentence || p.vietnamese_sentence}</p>
                     <p className="text-xs text-gray-400 font-mono">🔑 Keywords: {p.keywords}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // MÀN HÌNH 2: KẾT QUẢ CHẤM ĐIỂM
  if (submitResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full text-center animate-[fadeIn_0.5s_ease-out]">
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🤖</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Đánh giá từ hệ thống</h2>
          <div className="mb-6 p-4 bg-gray-50 rounded-xl text-left border border-gray-100">
             <p className="text-xs font-bold text-gray-400 uppercase mb-1">Đáp án mẫu (Tham khảo):</p>
             <p className="text-gray-800 font-medium">{currentPrompt.englishAnswer || currentPrompt.english_answer}</p>
          </div>
          <div className="flex justify-center gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-2xl flex-1">
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Độ chính xác Keyword</p>
              <p className="text-3xl font-black text-green-700">{Math.round(submitResult.score)}%</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl flex-1">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Thời gian</p>
              <p className="text-xl font-black text-blue-700 mt-2">{submitResult.durationSeconds}s</p>
            </div>
          </div>
          <button onClick={() => setCurrentPrompt(null)} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all">Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  // MÀN HÌNH 3: SOẠN THẢO (EDITOR)
  const keywordsList = (currentPrompt.keywords || "").split(',').map((k: string) => k.trim());

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => { if(window.confirm("Thoát sẽ mất bài?")) setCurrentPrompt(null); }} className="p-2 bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">Writing Practice</h1>
            <p className="text-xs text-rose-600 font-bold bg-rose-50 inline-block px-2 py-0.5 rounded-md mt-1">Đang làm bài</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-gray-100 overflow-hidden flex flex-col">
          
          <div className="p-6 md:p-10 border-b border-gray-100 bg-gray-50/50">
             <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm">🇻🇳</div>
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Câu gốc cần dịch</h2>
                  <p className="text-xl md:text-2xl text-gray-800 font-semibold leading-relaxed">"{currentPrompt.vietnameseSentence || currentPrompt.vietnamese_sentence}"</p>
                </div>
             </div>
             <div className="mt-8">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Từ vựng bắt buộc sử dụng (Keywords):</p>
                <div className="flex flex-wrap gap-2">
                  {keywordsList.map((keyword: string, index: number) => (
                    <span key={index} className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-bold shadow-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
             </div>
          </div>

          <div className="p-6 md:p-10 bg-white relative flex-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="text-lg">🇬🇧</span> Bản dịch của bạn
            </h2>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing your English translation here..."
              className="w-full min-h-[200px] bg-white border-2 border-gray-100 rounded-2xl p-6 text-gray-800 text-lg md:text-xl leading-relaxed focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none placeholder-gray-300 font-medium"
            />
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                Word count: {text.trim() === '' ? 0 : text.trim().split(/\s+/).length}
              </div>
              <div className="flex gap-3">
                 <button onClick={handleSubmit} className="px-8 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 hover:bg-rose-700 active:scale-[0.98] transition-all">
                  Nộp bài & Chấm điểm
                 </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default WritingEditor;