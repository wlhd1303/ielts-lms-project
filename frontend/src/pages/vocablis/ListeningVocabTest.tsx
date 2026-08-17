import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { vocabService } from '../../services/vocabService';

interface WordItem {
  id: number;
  englishWord: string;
  vietnameseMeaning: string;
}

const ListeningVocabTest = () => {
  const navigate = useNavigate();
  const { topicId } = useParams();
  
  const [words, setWords] = useState<WordItem[]>([]);
  const [allMeanings, setAllMeanings] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // TRẠNG THÁI BÀI TEST: Chỉ đếm ngược 3s ở câu đầu tiên (INITIAL_COUNTDOWN)
  const [gameState, setGameState] = useState<'INITIAL_COUNTDOWN' | 'PLAYING' | 'FEEDBACK' | 'SUMMARY'>('INITIAL_COUNTDOWN');
  const [startCountdown, setStartCountdown] = useState(3);
  const [answerTimeLeft, setAnswerTimeLeft] = useState(5);
  
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<{ word: WordItem; userAns: string | null; isCorrect: boolean }[]>([]);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // 1. TẢI DỮ LIỆU TỪ VỰNG
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await adminService.getWordsByTopic(Number(topicId));
        const wordList: WordItem[] = Array.isArray(res) ? res : res.data || [];
        
        if (wordList.length === 0) {
          alert("Chủ đề này chưa có từ vựng!");
          return navigate('/listening-vocab');
        }

        setWords(wordList);
        setAllMeanings(wordList.map(w => w.vietnameseMeaning));
        setIsLoading(false);
      } catch (error) {
        console.error("Lỗi nạp từ vựng:", error);
      }
    };
    fetchData();
  }, [topicId, navigate]);

  // 2. KHỞI TẠO CÂU HỎI MỚI (TẠO 4 ĐÁP ÁN TRẮC NGHIỆM)
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const currentWord = words[currentIndex];
    const setOpts = new Set<string>();
    setOpts.add(currentWord.vietnameseMeaning);
    
    while (setOpts.size < Math.min(4, allMeanings.length)) {
      const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
      setOpts.add(rand);
    }

    const optsArray = Array.from(setOpts);
    setOptions(optsArray.sort(() => Math.random() - 0.5));
    setSelectedAnswer(null);
    setAnswerTimeLeft(5);

    // Nếu là câu đầu tiên (index = 0): Đếm ngược 3s chuẩn bị
    if (currentIndex === 0 && gameState === 'INITIAL_COUNTDOWN') {
      setStartCountdown(3);
    } else {
      // Từ câu thứ 2 trở đi: Chuyển ngay sang PLAYING và phát âm thanh lập tức
      setGameState('PLAYING');
      playAudio(currentWord.englishWord);
    }
  }, [currentIndex, words, allMeanings]);

  // 3. ĐẾM NGƯỢC 3S CHO CÂU ĐẦU TIÊN
  useEffect(() => {
    if (gameState !== 'INITIAL_COUNTDOWN') return;

    if (startCountdown > 0) {
      const timer = setTimeout(() => setStartCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameState('PLAYING');
      if (words[0]) {
        playAudio(words[0].englishWord);
      }
    }
  }, [startCountdown, gameState, words]);

  // 4. ĐẾM NGƯỢC 5 GIÂY CHO MỖI CÂU TRẢ LỜI
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    timerRef.current = setInterval(() => {
      setAnswerTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSelectAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, currentIndex]);

  // 🔊 PHÁT ÂM THANH BẰNG WEB SPEECH API
  const playAudio = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // CHỌN ĐÁP ÁN: HIỆN FEEDBACK ĐÚNG/SAI 1S RỒI CHUYỂN CÂU MƯỢT MÀ
  const handleSelectAnswer = (ans: string | null) => {
    if (gameState !== 'PLAYING') return;
    clearInterval(timerRef.current);

    const currentWord = words[currentIndex];
    const isCorrect = ans === currentWord.vietnameseMeaning;

    setSelectedAnswer(ans);
    setGameState('FEEDBACK');

    const newResults = [...userResults, { word: currentWord, userAns: ans, isCorrect }];
    setUserResults(newResults);

    setTimeout(() => {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        finishTest(newResults);
      }
    }, 1000); // Ngừng đúng 1s hiển thị kết quả rồi tự động chuyển câu tiếp theo
  };

  const finishTest = async (finalResults: typeof userResults) => {
    setGameState('SUMMARY');
    const correctCount = finalResults.filter(r => r.isCorrect).length;
    const score = (correctCount / words.length) * 100;
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await vocabService.submitListeningVocabScore(Number(topicId), score, durationSeconds);
    } catch (error) {
      console.error("Lỗi nộp điểm Listening Vocab:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between p-6 text-white relative overflow-hidden select-none">
      
      {/* HEADER */}
      <header className="flex justify-between items-center max-w-2xl w-full mx-auto z-10">
        <button 
          onClick={() => navigate('/listening-vocab')}
          className="text-slate-400 hover:text-white font-bold text-xs bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 cursor-pointer transition-colors"
        >
          ✕ Thoát
        </button>
        <div className="text-center">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Listening Vocab Test</span>
          <p className="text-xs font-extrabold text-slate-300">Câu {currentIndex + 1} / {words.length}</p>
        </div>
        <div className="w-16" />
      </header>

      {/* BODY */}
      {gameState !== 'SUMMARY' ? (
        <main className="max-w-xl w-full mx-auto flex-1 flex flex-col items-center justify-center space-y-8 z-10 my-auto">
          
          {gameState === 'INITIAL_COUNTDOWN' ? (
            <div className="flex flex-col items-center space-y-4 animate-[bounce_0.5s_infinite]">
              <span className="text-8xl font-black text-amber-400 font-mono drop-shadow-[0_0_25px_rgba(251,191,36,0.4)]">
                {startCountdown}
              </span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chuẩn bị nghe...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center space-y-4">
                <button 
                  onClick={() => playAudio(currentWord?.englishWord)}
                  className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all border-2 border-white/20 cursor-pointer"
                >
                  🔊
                </button>
                <p className="text-xs font-bold text-slate-400">Bấm để nghe lại phát âm</p>

                <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(answerTimeLeft / 5) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-black text-amber-400">{answerTimeLeft}s</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4">
                {options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrectOpt = opt === currentWord?.vietnameseMeaning;

                  let btnStyle = "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700 cursor-pointer";

                  if (gameState === 'FEEDBACK') {
                    if (isCorrectOpt) {
                      btnStyle = "bg-emerald-600 border-emerald-400 text-white shadow-lg scale-[1.02]";
                    } else if (isSelected && !isCorrectOpt) {
                      btnStyle = "bg-rose-600 border-rose-400 text-white shadow-lg animate-shake";
                    } else {
                      btnStyle = "bg-slate-900/40 border-slate-900 text-slate-600 opacity-40";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={gameState === 'FEEDBACK'}
                      onClick={() => handleSelectAnswer(opt)}
                      className={`p-4 rounded-2xl border text-sm font-bold transition-all text-left flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {gameState === 'FEEDBACK' && isCorrectOpt && <span>✓</span>}
                      {gameState === 'FEEDBACK' && isSelected && !isCorrectOpt && <span>✕</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        </main>
      ) : (

        /* MÀN HÌNH TỔNG KẾT (SUMMARY) */
        <main className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-between py-6 space-y-6 z-10 overflow-y-auto custom-scrollbar">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎯
            </div>
            <h2 className="text-2xl font-black text-white">Kết Quả Luyện Phản Xạ</h2>
            <p className="text-xs font-semibold text-slate-400">
              Bạn trả lời đúng <span className="text-emerald-400 font-extrabold">{userResults.filter(r => r.isCorrect).length}</span> / {words.length} câu
            </p>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {userResults.map((res, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  res.isCorrect ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-rose-950/20 border-rose-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => playAudio(res.word.englishWord)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs cursor-pointer"
                  >
                    🔊
                  </button>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">{res.word.englishWord}</h4>
                    <p className="text-xs font-semibold text-emerald-400">Đúng: {res.word.vietnameseMeaning}</p>
                    {!res.isCorrect && (
                      <p className="text-[11px] font-bold text-rose-400">Bạn chọn: {res.userAns || 'Bỏ trống (Hết giờ)'}</p>
                    )}
                  </div>
                </div>

                <span className={`text-lg font-black ${res.isCorrect ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {res.isCorrect ? '✓' : '✕'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/listening-vocab')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Hoàn Tất & Quay Lại Thư Viện ➔
          </button>
        </main>
      )}

    </div>
  );
};

export default ListeningVocabTest;