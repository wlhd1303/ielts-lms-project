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
  const [analyzedWords, setAnalyzedWords] = useState<{ displayWord: string; isCorrect: boolean }[]>([]);
  
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

      setTimeout(() => {
        analyzePronunciation();
      }, 800);
    }
  };

  // =========================================================================
  // ⚡ THUẬT TOÁN TỐI ƯU PHÂN TÍCH PHÁT ÂM (FUZZY + HOMOPHONES + STEMMING)
  // =========================================================================

  // Từ đồng âm phổ biến trong tiếng Anh
  const HOMOPHONES_MAP: Record<string, string[]> = {
    'their': ['there', "they're"],
    'there': ['their', "they're"],
    "they're": ['their', 'there'],
    'to': ['too', 'two'],
    'too': ['to', 'two'],
    'two': ['to', 'too'],
    'hear': ['here'],
    'here': ['hear'],
    'see': ['sea'],
    'sea': ['see'],
    'buy': ['by', 'bye'],
    'by': ['buy', 'bye'],
    'sun': ['son'],
    'son': ['sun'],
    'right': ['write'],
    'write': ['right'],
    'know': ['no'],
    'no': ['know'],
    'weather': ['whether'],
    'whether': ['weather'],
    'hour': ['our'],
    'our': ['hour'],
    'for': ['four', 'fore'],
    'four': ['for'],
    'one': ['won'],
    'won': ['one']
  };

  // Chuẩn hóa văn bản loại bỏ viết tắt, số & từ đệm
  const normalizeSpeechText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/n't/g, " not")
      .replace(/'m/g, " am")
      .replace(/'re/g, " are")
      .replace(/'s/g, " is")
      .replace(/'ll/g, " will")
      .replace(/'ve/g, " have")
      .replace(/'d/g, " would")
      .replace(/\b1\b/g, "one")
      .replace(/\b2\b/g, "two")
      .replace(/\b3\b/g, "three")
      .replace(/\b4\b/g, "four")
      .replace(/\b5\b/g, "five")
      .replace(/\b6\b/g, "six")
      .replace(/\b7\b/g, "seven")
      .replace(/\b8\b/g, "eight")
      .replace(/\b9\b/g, "nine")
      .replace(/\b10\b/g, "ten")
      .replace(/\b(uh|um|ah|er|hmm|like)\b/gi, "") // Lọc bỏ từ đệm
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  // Tính khoảng cách Levenshtein giữa 2 từ
  const computeLevenshtein = (s1: string, s2: string): number => {
    const dp: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
    for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[s1.length][s2.length];
  };

  // Kiểm tra độ khớp âm thanh nâng cao
  const isMatchFlexible = (target: string, heard: string): boolean => {
    if (target === heard) return true;
    if (!target || !heard) return false;

    // 1. Kiểm tra từ đồng âm (Homophones)
    if (HOMOPHONES_MAP[target] && HOMOPHONES_MAP[target].includes(heard)) {
      return true;
    }

    // 2. Kiểm tra biến thể tiền tố/hậu tố s, es, ed, ing (Root Stem)
    if (target.length >= 4 && heard.length >= 4) {
      if (target.startsWith(heard) || heard.startsWith(target)) {
        return true;
      }
    }

    // 3. Tính độ tương đồng ký tự (Fuzzy Levenshtein >= 68%)
    const distance = computeLevenshtein(target, heard);
    const maxLen = Math.max(target.length, heard.length);
    const similarity = 1 - (distance / maxLen);

    return similarity >= 0.68;
  };

  const analyzePronunciation = async () => {
    if (!currentLesson) return;

    const rawTarget = currentLesson.content || currentLesson.title || '';
    
    // Tách các từ gốc giữ nguyên định dạng để render giao diện
    const rawTargetWords = rawTarget.split(/\s+/).filter(Boolean);
    const cleanUserWords = normalizeSpeechText(transcriptResult).split(/\s+/).filter(Boolean);

    let correctCount = 0;
    let userIndexCursor = 0; // Con trỏ theo dõi dòng ngữ cảnh

    const wordAnalysis = rawTargetWords.map((displayWord: string) => {
      const cleanTarget = normalizeSpeechText(displayWord);
      if (!cleanTarget) {
        return { displayWord, isCorrect: true };
      }

      // Cửa sổ trượt 6 từ kế tiếp trong transcript để giữ đúng ngữ cảnh đọc
      const searchWindow = cleanUserWords.slice(
        Math.max(0, userIndexCursor - 2), 
        Math.min(cleanUserWords.length, userIndexCursor + 5)
      );

      const matchedIndex = searchWindow.findIndex(userWord => isMatchFlexible(cleanTarget, userWord));

      let isMatched = false;
      if (matchedIndex !== -1) {
        isMatched = true;
        correctCount++;
        userIndexCursor = Math.max(0, userIndexCursor - 2) + matchedIndex + 1;
      } else {
        // Dò quét dự phòng trên toàn bộ transcript nếu bị lỡ nhịp
        const globalFallback = cleanUserWords.some(userWord => isMatchFlexible(cleanTarget, userWord));
        if (globalFallback) {
          isMatched = true;
          correctCount++;
        }
      }

      return { displayWord, isCorrect: isMatched };
    });

    const calculatedScore = rawTargetWords.length > 0 
      ? Math.min(100, Math.round((correctCount / rawTargetWords.length) * 100)) 
      : 0;

    setScoreResult(calculatedScore);
    setAnalyzedWords(wordAnalysis);
    setRecordingState('feedback');

    // Nộp điểm về Backend
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await speakingService.submitScore(currentLesson.id, calculatedScore, duration);
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

  // MÀN HÌNH 1: CHỌN BÀI LUYỆN NÓI
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

  // MÀN HÌNH 2: LÀM BÀI VÀ THU ÂM (ĐIỀU KIỆN PASS >= 60%)
  const isPass = scoreResult >= 60;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      
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
              Yêu cầu: Đúng ≥ 60% để PASS
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        
        <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col space-y-6">
          
          <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 relative space-y-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Câu chuẩn cần đọc</span>
               <button 
                 onClick={() => {
                   const utterance = new SpeechSynthesisUtterance(currentLesson.content);
                   utterance.lang = 'en-US';
                   utterance.rate = 0.9;
                   window.speechSynthesis.speak(utterance);
                 }}
                 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
               >
                 <span>🔊</span> Nghe Mẫu
               </button>
            </div>

            <p className="text-lg md:text-xl font-black text-slate-900 leading-relaxed">
              "{currentLesson.content}"
            </p>
          </div>

          <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-white min-h-[280px]">
            
            {(recordingState === 'idle' || recordingState === 'recording') && (
              <div className="flex flex-col items-center space-y-4 animate-[fadeIn_0.3s_ease-out] w-full">
                
                <div className="relative flex items-center justify-center">
                  {recordingState === 'recording' && (
                    <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-25 scale-125" />
                  )}
                  
                  <button 
                    onClick={handleToggleRecord}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl shadow-xl transition-all cursor-pointer ${
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

                {/* Danh sách từ đúng / sai nguyên bản theo văn bản gốc */}
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs md:text-sm font-semibold leading-relaxed flex flex-wrap gap-1.5">
                  {analyzedWords.map((item, index) => (
                    <span 
                      key={index}
                      className={item.isCorrect ? "text-emerald-700 font-bold" : "text-rose-600 font-bold underline decoration-rose-400 decoration-2"}
                    >
                      {item.displayWord}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setRecordingState('idle')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Thu Âm Lại
                  </button>
                  <button 
                    onClick={() => setCurrentLesson(null)}
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
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