import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockTestService } from '../../services/mockTestService';

interface WordItem {
  id: number;
  englishWord: string;
  vietnameseMeaning: string;
}

const VocabReviewTest = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Lấy ID bài Reading từ URL
  
  const [words, setWords] = useState<WordItem[]>([]);
  const [allMeanings, setAllMeanings] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [gameState, setGameState] = useState<'PLAYING' | 'FEEDBACK' | 'SUMMARY'>('PLAYING');
  const [answerTimeLeft, setAnswerTimeLeft] = useState(5);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<{ word: WordItem; userAns: string | null; isCorrect: boolean }[]>([]);

  const startTimeRef = useRef<number>(Date.now());

  // 1. NẠP TỪ VỰNG ĐÍCH DANH CỦA BÀI READING NÀY
  useEffect(() => {
    const fetchReadingWords = async () => {
      try {
        if (!id) {
          alert("Không tìm thấy thông tin bài Reading!");
          return navigate('/dashboard');
        }

        const res: any = await mockTestService.getExtractedWordsByTestId(Number(id));
        const wordList: WordItem[] = Array.isArray(res) ? res : (res?.data || []);

        if (wordList.length === 0) {
          alert("Bài Reading này chưa có danh sách từ vựng review!");
          return navigate('/dashboard');
        }

        // Trộn ngẫu nhiên và lấy tối đa 35 từ CHỈ THUỘC BÀI NÀY
        const shuffled = [...wordList].sort(() => Math.random() - 0.5).slice(0, 35);

        setWords(shuffled);
        setAllMeanings(wordList.map(w => w.vietnameseMeaning));
      } catch (error) {
        console.error("Lỗi nạp từ vựng bài Reading:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadingWords();
  }, [id, navigate]);

  // 2. KHỞI TẠO 4 ĐÁP ÁN TRẮC NGHIỆM CHO MỖI CÂU
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const currentWord = words[currentIndex];
    const setOpts = new Set<string>();
    setOpts.add(currentWord.vietnameseMeaning);

    while (setOpts.size < Math.min(4, allMeanings.length)) {
      const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
      setOpts.add(rand);
    }

    setOptions(Array.from(setOpts).sort(() => Math.random() - 0.5));
    setSelectedAnswer(null);
    setAnswerTimeLeft(5);
    setGameState('PLAYING');
  }, [currentIndex, words, allMeanings]);

  // 3. ĐẾM NGƯỢC 5 GIÂY TỰ ĐỘNG CHUYỂN CÂU
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (answerTimeLeft > 0) {
      const timer = setTimeout(() => setAnswerTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleSelectAnswer(null);
    }
  }, [answerTimeLeft, gameState]);

  // 4. BẤM CHỌN ĐÁP ÁN -> HIỆN ĐÚNG/SAI 1.5S RỒI TỰ CHUYỂN CÂU
  const handleSelectAnswer = (ans: string | null) => {
    if (gameState !== 'PLAYING') return;

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
        finishReviewTest(newResults);
      }
    }, 1500);
  };

  // ⚡ 5. HOÀN THÀNH BÀI TEST -> GỬI ĐIỂM VÀ KÍCH HOẠT TÍNH CHUỖI STREAK
  const finishReviewTest = async (finalResults: typeof userResults) => {
    setGameState('SUMMARY');

    const correctCount = finalResults.filter(r => r.isCorrect).length;
    const score = words.length > 0 ? (correctCount / words.length) * 100 : 0;
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      // Gọi đúng endpoint Backend để chấm điểm và tăng Streak
      await mockTestService.submitVocabTest(score, durationSeconds);
    } catch (error) {
      console.error("Lỗi ghi nhận điểm và Streak:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex flex-col justify-between p-6 text-white select-none">
      
      {/* HEADER TẬP TRUNG */}
      <header className="flex justify-between items-center max-w-2xl w-full mx-auto">
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-slate-400 hover:text-white font-bold text-xs bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 cursor-pointer transition-colors"
        >
          ✕ Thoát
        </button>
        <div className="text-center">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Review Từ Vựng Bài Reading #{id}</span>
          <p className="text-xs font-extrabold text-slate-300">Câu {currentIndex + 1} / {words.length}</p>
        </div>
        <div className="w-16" />
      </header>

      {gameState !== 'SUMMARY' ? (
        <main className="max-w-xl w-full mx-auto flex-1 flex flex-col items-center justify-center space-y-6 my-auto">
          
          {/* TỪ TIẾNG ANH CẦN KIỂM TRA */}
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-white tracking-wide uppercase">{currentWord?.englishWord}</h2>
            <p className="text-xs font-semibold text-slate-400">Chọn nghĩa Tiếng Việt chính xác nhất</p>
          </div>

          {/* THANH ĐẾM NGƯỢC 5 GIÂY */}
          <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(answerTimeLeft / 5) * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs font-black text-amber-400">{answerTimeLeft}s</span>

          {/* 4 ĐÁP ÁN TRẮC NGHIỆM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-4">
            {options.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              const isCorrectOpt = opt === currentWord.vietnameseMeaning;

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

        </main>
      ) : (

        /* MÀN HÌNH TỔNG KẾT & CHÍNH THỨC HOÀN THÀNH STREAK */
        <main className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-between py-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center text-3xl mx-auto">
              🔥
            </div>
            <h2 className="text-2xl font-black text-white">Hoàn Thành Review Từ Vựng Bài Reading!</h2>
            <p className="text-xs font-semibold text-slate-400">
              Bạn trả lời đúng <span className="text-emerald-400 font-extrabold">{userResults.filter(r => r.isCorrect).length}</span> / {words.length} câu. Chuỗi Streak hôm nay đã được ghi nhận!
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            Quay Về Dashboard ➔
          </button>
        </main>
      )}

    </div>
  );
};

export default VocabReviewTest;