import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { vocabService } from '../../services/vocabService';

type ViewState = 'LOADING' | 'TOPIC_SELECTION' | 'PLAYING' | 'FINISHED';

const VocabularyQuiz = () => {
  const navigate = useNavigate();
  
  // Trạng thái màn hình hiện tại
  const [viewState, setViewState] = useState<ViewState>('LOADING');
  
  // Dữ liệu
  const [topics, setTopics] = useState<any[]>([]);
  const [words, setWords] = useState<any[]>([]);
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

  // 1. KHI VỪA VÀO TRANG: Lấy danh sách Topic của lớp học viên đang học
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Tài khoản của bạn chưa được xếp lớp!");
          navigate('/dashboard');
          return;
        }

        // Lấy danh sách Chủ đề (Topics)
        const topicsRes: any = await vocabService.getTopicsByClass(classId);
        const topicsData = Array.isArray(topicsRes) ? topicsRes : (topicsRes?.data || []);
        
        setTopics(topicsData);
        setViewState('TOPIC_SELECTION'); // Chuyển sang màn hình Chọn chủ đề
        
      } catch (error) {
        console.error("Lỗi khi tải danh sách chủ đề:", error);
        navigate('/dashboard');
      }
    };

    fetchTopics();
  }, [navigate]);

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
        setViewState('PLAYING'); // Chuyển sang màn hình làm bài
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
        setSubmitResult(result);
        setViewState('FINISHED'); // Chuyển sang màn hình kết quả
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
         <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-10 w-10 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-500 font-bold">Đang tải dữ liệu...</span>
         </div>
      </div>
    );
  }

  // ---------------- GIAO DIỆN CHỌN CHỦ ĐỀ (TOPIC SELECTION) ----------------
  if (viewState === 'TOPIC_SELECTION') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm z-10">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Vocabulary Topics</h1>
            <p className="text-xs text-gray-500 font-medium">Chọn chủ đề để luyện tập</p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {topics.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center shadow-sm">
              <span className="text-5xl mb-4 block">📚</span>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa có chủ đề nào</h2>
              <p className="text-gray-500">Giáo viên chưa thêm từ vựng cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <div 
                  key={topic.id}
                  onClick={() => handleStartTopic(topic.id, topic.name)}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-purple-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mb-4 shadow-sm">
                    🏷️
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{topic.name}</h3>
                  <div className="mt-4 flex items-center text-sm font-bold text-purple-600">
                    Bắt đầu luyện tập <span className="ml-2 group-hover:translate-x-1 transition-transform">➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---------------- GIAO DIỆN HOÀN THÀNH (FINISHED) ----------------
  if (viewState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-[fadeIn_0.5s_ease-out]">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">🎉</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Tuyệt vời!</h2>
          <p className="text-gray-500 mb-8 font-medium">Bạn đã hoàn thành chủ đề <strong className="text-purple-600">{currentTopicName}</strong></p>
          
          <div className="flex justify-center gap-6 mb-10">
            <div className="bg-blue-50 p-4 rounded-2xl w-32 shadow-sm">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Số câu đúng</p>
              <p className="text-3xl font-black text-blue-700">{submitResult?.score || 0} / {words.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl w-32 shadow-sm">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Thời gian</p>
              <p className="text-3xl font-black text-purple-700">{submitResult?.durationSeconds || 0}s</p>
            </div>
          </div>

          <div className="space-y-3">
             <button onClick={() => setViewState('TOPIC_SELECTION')} className="w-full py-4 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-all">
               Làm chủ đề khác
             </button>
             <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all">
               Quay về trang chủ
             </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- GIAO DIỆN LÀM BÀI (PLAYING) ----------------
  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                if (window.confirm("Bạn có chắc muốn thoát? Kết quả bài làm sẽ không được lưu.")) {
                    setViewState('TOPIC_SELECTION');
                }
            }}
            className="p-2 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">{currentTopicName}</h1>
            <p className="text-xs text-purple-600 font-bold bg-purple-50 inline-block px-2 py-0.5 rounded-md mt-1">
              Từ {currentIndex + 1} / {words.length}
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400">{Math.round(((currentIndex + 1) / words.length) * 100)}%</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(147,_51,_234,_0.05)] border border-gray-100 overflow-hidden flex flex-col">
          
          <div className="p-8 md:p-12 border-b border-gray-100 bg-gradient-to-b from-purple-50/30 to-white text-center relative">
            <button 
              className="mx-auto w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center hover:bg-purple-200 transition-colors mb-4 active:scale-95 shadow-sm"
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
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 5.039v13.922c0 .891-1.077 1.337-1.707.707L6.5 14.879H3A2 2 0 011 12.879v-1.758a2 2 0 012-2h3.5l4.793-4.793C11.923 3.702 13 4.148 13 5.039zM17.485 7.515a1 1 0 011.414 0 6.364 6.364 0 010 9l-1.414-1.414a4.364 4.364 0 000-6.172l1.414-1.414zm2.829-2.829a1 1 0 011.414 0 10.364 10.364 0 010 14.628l-1.414-1.414a8.364 8.364 0 000-11.8l1.414-1.414z"/></svg>
            </button>

            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-2">
              {currentWord.englishWord}
            </h2>
          </div>

          <div className="p-6 md:p-8 bg-white">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
              Chọn nghĩa chính xác nhất
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shuffledOptions.map((option, index) => {
                let buttonStyle = "bg-white border-2 border-gray-100 text-gray-700 hover:border-purple-300 hover:bg-purple-50 cursor-pointer";
                
                if (isAnswered) {
                  if (option === currentWord.vietnameseMeaning) {
                    buttonStyle = "bg-green-50 border-2 border-green-500 text-green-700 shadow-sm cursor-default"; 
                  } else if (option === selectedOption) {
                    buttonStyle = "bg-red-50 border-2 border-red-400 text-red-700 cursor-default"; 
                  } else {
                    buttonStyle = "bg-gray-50 border-2 border-gray-100 text-gray-400 opacity-60 cursor-default";
                  }
                }

                return (
                  <button 
                    key={index}
                    onClick={() => handleSelect(option)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl font-bold text-lg transition-all duration-200 ${buttonStyle} flex items-center justify-between text-left`}
                  >
                    <span>{option}</span>
                    {isAnswered && option === currentWord.vietnameseMeaning && <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">✓</span>}
                    {isAnswered && option === selectedOption && option !== currentWord.vietnameseMeaning && <span className="w-6 h-6 rounded-full bg-red-400 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">✕</span>}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="mt-8 animate-[fadeIn_0.3s_ease-out]">
                <button 
                  onClick={handleNext}
                  className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:bg-purple-700 active:scale-[0.98] transition-all"
                >
                  {currentIndex < words.length - 1 ? 'Câu tiếp theo ➔' : 'Hoàn thành nộp bài ✅'}
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