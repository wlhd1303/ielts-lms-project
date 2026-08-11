import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { speakingService } from '../../services/speakingService';
import { adminService } from '../../services/adminService';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const SpeakingShadowing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streakLessonId = searchParams.get('streakLessonId');

  // Trạng thái màn hình
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Trạng thái thu âm & chấm điểm
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'analyzing' | 'feedback'>('idle');
  const [transcriptResult, setTranscriptResult] = useState('');
  const [scoreResult, setScoreResult] = useState<number>(0);
  const [analyzedWords, setAnalyzedWords] = useState<{ word: string; isCorrect: boolean }[]>([]);
  
  const [startTime, setStartTime] = useState<number>(0);
  const recognitionRef = useRef<any>(null);

  // 1. Tải danh sách bài Speaking và nạp lịch sử các bài đã hoàn thành
  useEffect(() => {
    const fetchLessonsAndHistory = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!");
          return navigate('/dashboard');
        }

        // ⚡ Lấy mảng bài Speaking đã hoàn thành của học viên
        const recordsRes: any = await adminService.getRecentActivities();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'SPEAKING' && r.user?.id === userData.id)
            .map((r: any) => r.refId)
        );
        setCompletedLessonIds(doneSet);

        const res: any = await speakingService.getLessonsByClass(classId);
        const data = Array.isArray(res) ? res : res.data || [];
        setLessons(data);

        // ⚡ Mở bài trực tiếp nếu tới từ nút Streak trên Dashboard
        if (streakLessonId) {
          const found = data.find((l: any) => l.id === Number(streakLessonId));
          if (found) {
            handleStartLesson(found);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessonsAndHistory();
  }, [navigate, streakLessonId]);

  // Khởi tạo Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscriptResult(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Lỗi Micro:", event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleStartLesson = (lesson: any) => {
    setCurrentLesson(lesson);
    setRecordingState('idle');
    setTranscriptResult('');
    setScoreResult(0);
    setAnalyzedWords([]);
    setStartTime(Date.now());
  };

  // Bắt đầu / Dừng thu âm
  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt của bạn không hỗ trợ thu âm Web Speech API. Vui lòng dùng Chrome!");
      return;
    }

    if (recordingState === 'idle' || recordingState === 'feedback') {
      setTranscriptResult('');
      setRecordingState('recording');
      recognitionRef.current.start();
    } else if (recordingState === 'recording') {
      recognitionRef.current.stop();
      setRecordingState('analyzing');

      // AI Phân tích kết quả giọng nói sau 1 giây
      setTimeout(() => {
        analyzePronunciation();
      }, 1000);
    }
  };

  // Thuật toán so sánh & chấm điểm
  const analyzePronunciation = async () => {
    if (!currentLesson) return;

    const targetText = currentLesson.content || currentLesson.title || '';
    const cleanTarget = targetText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const cleanUser = transcriptResult.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

    let correctCount = 0;
    const wordAnalysis = cleanTarget.map((targetWord: string) => {
      const isMatched = cleanUser.includes(targetWord);
      if (isMatched) correctCount++;
      return { word: targetWord, isCorrect: isMatched };
    });

    const calculatedScore = Math.round((correctCount / cleanTarget.length) * 100);
    setScoreResult(calculatedScore);
    setAnalyzedWords(wordAnalysis);
    setRecordingState('feedback');

    // Nộp điểm về Backend
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await speakingService.submitScore(currentLesson.id, calculatedScore, duration);
      
      // ⚡ Tự động cập nhật ID bài vừa làm vào mảng DONE
      setCompletedLessonIds(prev => new Set(prev).add(currentLesson.id));
    } catch (err) {
      console.error("Lỗi lưu điểm:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // MÀN HÌNH 1: CHỌN BÀI LUYỆN NÓI (CÓ CỜ DONE)
  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all mr-4">
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Speaking Lessons</h1>
            <p className="text-[11px] font-semibold text-slate-400">Chọn bài tập luyện đọc Shadowing tiếng Anh</p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {lessons.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm space-y-2">
              <span className="text-4xl block">🎙️</span>
              <p className="text-xs text-slate-500 font-bold">Giáo viên chưa cập nhật bài Speaking nào cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => {
                const isDone = completedLessonIds.has(lesson.id);
                return (
                  <div 
                    key={lesson.id} 
                    onClick={() => handleStartLesson(lesson)} 
                    className={`bg-white p-6 rounded-3xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-[0.99] ${
                      isDone 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-slate-200/80 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-amber-100">
                        🎙️
                      </div>
                      
                      {/* ⚡ CỜ BADGE HIỂN THỊ DONE */}
                      {isDone ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                          Shadowing
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">{lesson.title}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-2">"{lesson.content}"</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                      <span>{isDone ? 'Luyện phát âm lại' : 'Luyện phát âm ngay'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">➔</span>
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

  // MÀN HÌNH 2: LÀM BÀI VÀ THU ÂM THỰC TẾ
  const isPass = scoreResult >= 70;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentLesson(null)}
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">{currentLesson.title}</h1>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md mt-0.5 inline-block border border-amber-200/60">
              Yêu cầu: Đúng ≥ 70% để PASS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        
        <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col space-y-6">
          
          {/* Câu mẫu & Nút Nghe giọng mẫu */}
          <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 relative space-y-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Câu chuẩn cần đọc</span>
               <button 
                 onClick={() => {
                   const utterance = new SpeechSynthesisUtterance(currentLesson.content);
                   utterance.lang = 'en-US';
                   window.speechSynthesis.speak(utterance);
                 }}
                 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-all active:scale-95"
               >
                 <span>🔊</span> Nghe Mẫu
               </button>
            </div>

            <p className="text-lg md:text-xl font-black text-slate-900 leading-relaxed">
              "{currentLesson.content}"
            </p>
          </div>

          {/* Khu vực Thu âm & Feedback Real-time */}
          <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-white min-h-[280px]">
            
            {(recordingState === 'idle' || recordingState === 'recording') && (
              <div className="flex flex-col items-center space-y-4 animate-[fadeIn_0.3s_ease-out] w-full">
                
                <div className="relative flex items-center justify-center">
                  {recordingState === 'recording' && (
                    <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-25 scale-125" />
                  )}
                  
                  <button 
                    onClick={handleToggleRecord}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl shadow-xl transition-all ${
                      recordingState === 'recording' 
                        ? 'bg-rose-600 scale-105 shadow-rose-600/30' 
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 active:scale-95'
                    }`}
                  >
                    {recordingState === 'recording' ? '⏹' : '🎙️'}
                  </button>
                </div>
                
                <p className={`text-xs font-bold ${recordingState === 'recording' ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                  {recordingState === 'recording' ? 'Đang lắng nghe... Bấm nút STOP để chấm điểm' : 'Bấm Micro để bắt đầu đọc'}
                </p>

                {/* Văn bản ghi âm nhận diện được trực tiếp */}
                {transcriptResult && (
                  <div className="w-full p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">Giọng nói nhận diện được:</p>
                    <p className="text-xs font-bold text-slate-700 italic">"{transcriptResult}"</p>
                  </div>
                )}
              </div>
            )}

            {recordingState === 'analyzing' && (
              <div className="flex flex-col items-center space-y-3 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-600">Đang đối soát giọng nói và chấm tỷ lệ chính xác...</p>
              </div>
            )}

            {recordingState === 'feedback' && (
              <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Đánh giá phát âm</span>
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                       isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                     }`}>
                       {isPass ? '✓ PASSED (ĐẠT)' : '✕ FAILED (THỬ LẠI)'}
                     </span>
                   </div>

                   <div className={`font-black px-3.5 py-1 rounded-xl text-base border ${
                     isPass ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'
                   }`}>
                     {scoreResult}% Điểm
                   </div>
                </div>

                {/* Danh sách từ đúng / sai */}
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs md:text-sm font-semibold leading-relaxed flex flex-wrap gap-1.5">
                  {analyzedWords.map((item, index) => (
                    <span 
                      key={index}
                      className={item.isCorrect ? "text-emerald-700 font-bold" : "text-rose-600 font-bold underline decoration-rose-400 decoration-2"}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setRecordingState('idle')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Thu Âm Lại
                  </button>
                  <button 
                    onClick={() => setCurrentLesson(null)}
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                  >
                    Làm Bài Khác ➔
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
};

export default SpeakingShadowing;