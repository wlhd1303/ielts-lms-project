import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { vocabService } from '../../services/vocabService';
import { adminService } from '../../services/adminService';

type ViewState = 'LOADING' | 'TOPIC_SELECTION' | 'PLAYING' | 'FINISHED';

const VocabularyQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streakTopicId = searchParams.get('streakTopicId');
  
  // Trạng thái màn hình hiện tại
  const [viewState, setViewState] = useState<ViewState>('LOADING');
  
  // Dữ liệu
  const [topics, setTopics] = useState<any[]>([]);
  const [words, setWords] = useState<any[]>([]);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<number>>(new Set());
  const [currentTopicId, setCurrentTopicId] = useState<number | null>(null);
  const [currentTopicName, setCurrentTopicName] = useState<string>('');
  
  // State khi làm bài
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // 1. KHI VỪA VÀO TRANG: Lấy danh sách Topic và nạp lịch sử bài đã làm
  useEffect(() => {
    const fetchTopicsAndHistory = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Tài khoản của bạn chưa được xếp lớp!");
          navigate('/dashboard');
          return;
        }

        // ⚡ Lấy mảng bài tập Vocab đã hoàn thành của học viên
        const recordsRes: any = await adminService.getRecentActivities();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'VOCAB' && r.user?.id === userData.id)
            .map((r: any) => r.refId)
        );
        setCompletedTopicIds(doneSet);

        const topicsRes: any = await vocabService.getTopicsByClass(classId);
        const topicsData = Array.isArray(topicsRes) ? topicsRes : (topicsRes?.data || []);
        setTopics(topicsData);

        // ⚡ Tự động mở bài tập nếu tới từ nút Streak trên Dashboard
        if (streakTopicId) {
          const targetId = Number(streakTopicId);
          const foundTopic = topicsData.find((t: any) => t.id === targetId);
          if (foundTopic) {
            await handleStartTopic(foundTopic.id, foundTopic.name);
            return;
          }
        }
        
        setViewState('TOPIC_SELECTION');
        
      } catch (error) {
        console.error("Lỗi khi tải danh sách chủ đề:", error);
        navigate('/dashboard');
      }
    };

    fetchTopicsAndHistory();
  }, [navigate, streakTopicId]);

  // 2. KHI HỌC VIÊN CHỌN 1 CHỦ ĐỀ: Tải từ vựng của chủ đề đó và bắt đầu làm bài
  const handleStartTopic = async (topicId: number, topicName: string) => {
    setViewState('LOADING');
    try {
      const wordsRes: any = await vocabService.getWordsByTopic(topicId);
      const wordsData = Array.isArray(wordsRes) ? wordsRes : (wordsRes?.data || []);
      
      if (wordsData.length > 0) {
        setWords(wordsData);
        setCurrentTopicId(topicId);
        setCurrentTopicName(topicName);
        setCurrentIndex(0);
        setUserAnswers({});
        setStartTime(Date.now());
        setViewState('PLAYING');
      } else {
        alert("Chủ đề này hiện chưa có từ vựng nào!");
        setViewState('TOPIC_SELECTION');
      }
    } catch (error) {
      console.error("Lỗi khi tải từ vựng:", error);
      alert("Lỗi khi tải dữ liệu chủ đề!");
      setViewState('TOPIC_SELECTION');
    }
  };

  // Thuật toán: Trộn đáp án mỗi khi qua câu mới
  useEffect(() => {
    if (viewState === 'PLAYING' && words.length > 0 && currentIndex < words.length) {
      const currentWord = words[currentIndex];
      const options = [
        currentWord.vietnameseMeaning,
        currentWord.wrongOption1,
        currentWord.wrongOption2,
        currentWord.wrongOption3
      ].filter(Boolean);

      setShuffledOptions(options.sort(() => Math.random() - 0.5));
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [currentIndex, words, viewState]);

  const handleSelect = (optionStr: string) => {
    if (isAnswered) return;
    
    setSelectedOption(optionStr);
    setIsAnswered(true);

    const currentWord = words[currentIndex];
    setUserAnswers(prev => ({
      ...prev,
      [currentWord.id]: optionStr
    }));
  };

  const handleNext = async () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setViewState('LOADING');
      try {
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        const result = await vocabService.submitQuiz(currentTopicId!, userAnswers, durationSeconds);
        setSubmitResult(result?.data || result);
        
        // ⚡ Tự động cập nhật ID bài vừa làm vào mảng DONE
        if (currentTopicId) {
          setCompletedTopicIds(prev => new Set(prev).add(currentTopicId));
        }

        setViewState('FINISHED');
      } catch (error) {
        console.error("Lỗi khi nộp bài:", error);
        alert("Có lỗi xảy ra khi nộp bài!");
        setViewState('PLAYING');
      }
    }
  };

  // ---------------- GIAO DIỆN MÀN HÌNH LOADING ----------------
  if (viewState === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Đang chuẩn bị bộ từ vựng...</span>
        </div>
      </div>
    );
  }

  // ---------------- GIAO DIỆN CHỌN CHỦ ĐỀ (TOPIC SELECTION) ----------------
  if (viewState === 'TOPIC_SELECTION') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center gap-4 shadow-sm z-10 sticky top-0">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Vocabulary Topics</h1>
            <p className="text-[11px] font-semibold text-slate-400">Chọn chủ đề từ vựng để luyện phản xạ trắc nghiệm</p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {topics.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm space-y-2">
              <span className="text-4xl block">📚</span>
              <p className="text-xs text-slate-500 font-bold">Giáo viên chưa cập nhật từ vựng cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => {
                const isDone = completedTopicIds.has(topic.id);
                return (
                  <div 
                    key={topic.id}
                    onClick={() => handleStartTopic(topic.id, topic.name)}
                    className={`bg-white p-6 rounded-3xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-[0.99] ${
                      isDone 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-slate-200/80 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-purple-100">
                        🏷️
                      </div>

                      {/* ⚡ CỜ BADGE HIỂN THỊ DONE */}
                      {isDone ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                          Trắc nghiệm
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">{topic.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">Luyện tập chọn nghĩa từ vựng tiếng Anh</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                      <span>{isDone ? 'Luyện tập lại' : 'Bắt đầu luyện tập'}</span>
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

  // ---------------- GIAO DIỆN HOÀN THÀNH (FINISHED) ----------------
  if (viewState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full text-center space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
            🎉
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Tuyệt Vời! Hoàn Thành!</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Chủ đề: <span className="text-slate-800 font-bold">{currentTopicName}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Số câu đúng</p>
              <p className="text-2xl font-black text-purple-800">{submitResult?.score || 0} / {words.length}</p>
            </div>
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Thời gian</p>
              <p className="text-2xl font-black text-blue-800 font-mono">{submitResult?.durationSeconds || 0}s</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button 
              onClick={() => setViewState('TOPIC_SELECTION')} 
              className="w-full py-3.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition-all border border-purple-200/60"
            >
              Làm Chủ Đề Khác
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md text-xs transition-all active:scale-95"
            >
              Quay Về Trang Chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- GIAO DIỆN LÀM BÀI (PLAYING) ----------------
  const currentWord = words[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.confirm("Thoát bài làm sẽ không lưu kết quả?")) {
                setViewState('TOPIC_SELECTION');
              }
            }}
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900">{currentTopicName}</h1>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
              Từ {currentIndex + 1} / {words.length}
            </span>
          </div>
        </div>

        {/* Tiến trình % */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400">{progressPercent}%</span>
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6">
          
          {/* Từ Tiếng Anh + Nút Phát Âm */}
          <div className="p-8 md:p-10 bg-slate-50/50 border-b border-slate-100 text-center relative space-y-4">
            <button 
              title="Nghe phát âm"
              className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl inline-flex items-center justify-center font-bold text-lg shadow-sm hover:bg-purple-200 active:scale-95 transition-all"
              onClick={() => {
                if (currentWord.audioUrl) {
                  new Audio(currentWord.audioUrl).play();
                } else {
                  const utterance = new SpeechSynthesisUtterance(currentWord.englishWord);
                  utterance.lang = 'en-US';
                  window.speechSynthesis.speak(utterance);
                }
              }}
            >
              🔊
            </button>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {currentWord.englishWord}
            </h2>
          </div>

          {/* 4 Lựa chọn Trắc nghiệm */}
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">
              Chọn nghĩa Tiếng Việt chính xác nhất
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shuffledOptions.map((option, index) => {
                let buttonStyle = "bg-white border-slate-200/80 text-slate-800 hover:border-purple-400 hover:bg-purple-50/30 cursor-pointer";
                
                if (isAnswered) {
                  if (option === currentWord.vietnameseMeaning) {
                    buttonStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm cursor-default"; 
                  } else if (option === selectedOption) {
                    buttonStyle = "bg-rose-50 border-rose-400 text-rose-800 font-bold cursor-default"; 
                  } else {
                    buttonStyle = "bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-default";
                  }
                }

                return (
                  <button 
                    key={index}
                    onClick={() => handleSelect(option)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl border text-xs md:text-sm font-bold transition-all duration-200 ${buttonStyle} flex items-center justify-between text-left`}
                  >
                    <span>{option}</span>
                    {isAnswered && option === currentWord.vietnameseMeaning && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 shadow-sm">✓</span>
                    )}
                    {isAnswered && option === selectedOption && option !== currentWord.vietnameseMeaning && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shrink-0 shadow-sm">✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="pt-4 animate-[fadeIn_0.3s_ease-out]">
                <button 
                  onClick={handleNext}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/25 active:scale-95"
                >
                  {currentIndex < words.length - 1 ? 'Câu Tiếp Theo ➔' : 'Hoàn Thành Bài Thi ✅'}
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default VocabularyQuiz;