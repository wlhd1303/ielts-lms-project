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

interface SpeakingTopicItem {
  id: number;
  name: string;
  sentenceCount?: number;
}

interface SpeakingSentenceItem {
  id: number;
  englishSentence: string;
  vietnameseMeaning?: string;
  orderIndex?: number;
}

const PASS_SCORE = 60; // Ngưỡng điểm chuẩn để ĐẠT (PASS) câu luyện nói

const SpeakingShadowing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streakLessonId = searchParams.get('streakLessonId');

  // Trạng thái dữ liệu
  const [topics, setTopics] = useState<SpeakingTopicItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopicItem | null>(null);
  const [sentences, setSentences] = useState<SpeakingSentenceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Trạng thái bài hoàn thành (ID các câu đã nộp đạt điểm)
  const [completedSentenceIds, setCompletedSentenceIds] = useState<Set<number>>(new Set());
  const [topicSentencesMap, setTopicSentencesMap] = useState<Record<number, SpeakingSentenceItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Trạng thái thu âm & chấm điểm
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'analyzing' | 'feedback'>('idle');
  const [transcriptResult, setTranscriptResult] = useState('');
  const [scoreResult, setScoreResult] = useState<number>(0);
  const [analyzedWords, setAnalyzedWords] = useState<{ displayWord: string; isCorrect: boolean }[]>([]);
  
  const [startTime, setStartTime] = useState<number>(0);
  const recognitionRef = useRef<any>(null);

  // 1. Tải danh sách Topics, các câu hỏi và nạp lịch sử bài đã làm
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

        // Lấy lịch sử nộp bài Speaking đã hoàn thành (refId = sentenceId)
        const recordsRes: any = await adminService.getMyRecords();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'SPEAKING')
            .map((r: any) => Number(r.refId))
        );
        setCompletedSentenceIds(doneSet);

        // Lấy danh sách Topics
        const topicsRes: any = await speakingService.getTopicsByClass(classId);
        const topicList: SpeakingTopicItem[] = Array.isArray(topicsRes) ? topicsRes : (topicsRes?.data || []);
        
        // Tải trước các câu của từng topic để hiển thị số lượng & kiểm tra hoàn thành
        const sMap: Record<number, SpeakingSentenceItem[]> = {};
        let matchedDirectTopic: SpeakingTopicItem | null = null;
        let matchedSentenceIndex = 0;

        await Promise.all(
          topicList.map(async (t) => {
            try {
              const sentRes: any = await speakingService.getSentencesByTopic(t.id);
              const sentList: SpeakingSentenceItem[] = Array.isArray(sentRes) ? sentRes : (sentRes?.data || []);
              sMap[t.id] = sentList;

              // Kiểm tra nếu có streakLessonId truyền vào
              if (streakLessonId && !matchedDirectTopic) {
                const targetId = Number(streakLessonId);
                const foundIdx = sentList.findIndex(s => s.id === targetId);
                if (foundIdx !== -1) {
                  matchedDirectTopic = t;
                  matchedSentenceIndex = foundIdx;
                }
              }
            } catch (err) {
              sMap[t.id] = [];
            }
          })
        );

        setTopicSentencesMap(sMap);
        setTopics(topicList);

        // Tự động mở bài nếu điều hướng từ Streak
        if (matchedDirectTopic) {
          setSelectedTopic(matchedDirectTopic);
          setSentences(sMap[(matchedDirectTopic as SpeakingTopicItem).id] || []);
          setCurrentIndex(matchedSentenceIndex);
          resetRecording();
        }
      } catch (error) {
        console.error("Lỗi khởi tạo bài Speaking:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopicsAndHistory();
  }, [navigate, streakLessonId]);

  // 2. Khởi tạo Web Speech Recognition
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

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const resetRecording = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setRecordingState('idle');
    setTranscriptResult('');
    setScoreResult(0);
    setAnalyzedWords([]);
    setStartTime(Date.now());
  };

  // Chọn Topic để bắt đầu luyện tập
  const handleSelectTopic = (topic: SpeakingTopicItem) => {
    const topicSentences = topicSentencesMap[topic.id] || [];
    if (topicSentences.length === 0) {
      alert("Chủ đề này chưa có câu luyện nói nào. Vui lòng chọn chủ đề khác!");
      return;
    }

    setSelectedTopic(topic);
    setSentences(topicSentences);

    // Tìm câu đầu tiên chưa hoàn thành, nếu đã hoàn thành hết thì bắt đầu từ câu 1
    const firstUnfinishedIdx = topicSentences.findIndex(s => !completedSentenceIds.has(s.id));
    setCurrentIndex(firstUnfinishedIdx !== -1 ? firstUnfinishedIdx : 0);
    resetRecording();
  };

  // Chuyển sang câu cụ thể trong Topic
  const handleSelectSentenceIndex = (index: number) => {
    if (index >= 0 && index < sentences.length) {
      if (recognitionRef.current && recordingState === 'recording') {
        recognitionRef.current.stop();
      }
      setCurrentIndex(index);
      resetRecording();
    }
  };

  // Chuyển câu kế tiếp (Cách A)
  const handleNextSentence = () => {
    if (currentIndex < sentences.length - 1) {
      handleSelectSentenceIndex(currentIndex + 1);
    } else {
      // Đã hoàn thành câu cuối cùng
      alert("🎉 Chúc mừng bạn đã hoàn thành tất cả các câu trong chủ đề này!");
      setSelectedTopic(null);
    }
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
      .replace(/\b(uh|um|ah|er|hmm|like)\b/gi, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

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

  const isMatchFlexible = (target: string, heard: string): boolean => {
    if (target === heard) return true;
    if (!target || !heard) return false;

    // 1. Kiểm tra từ đồng âm
    if (HOMOPHONES_MAP[target] && HOMOPHONES_MAP[target].includes(heard)) {
      return true;
    }

    // 2. Kiểm tra biến thể tiền tố/hậu tố (Root Stem)
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
    const currentSentence = sentences[currentIndex];
    if (!currentSentence) return;

    const rawTarget = currentSentence.englishSentence || '';
    const rawTargetWords = rawTarget.split(/\s+/).filter(Boolean);
    const cleanUserWords = normalizeSpeechText(transcriptResult).split(/\s+/).filter(Boolean);

    let correctCount = 0;
    let userIndexCursor = 0;

    const wordAnalysis = rawTargetWords.map((displayWord: string) => {
      const cleanTarget = normalizeSpeechText(displayWord);
      if (!cleanTarget) {
        return { displayWord, isCorrect: true };
      }

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
      const res: any = await speakingService.submitSentenceScore(
        currentSentence.id, 
        calculatedScore, 
        duration, 
        transcriptResult
      );
      const serverScore = res?.score ?? res?.data?.score;
      if (serverScore !== undefined && serverScore !== null) {
        setScoreResult(Math.round(serverScore));
      }
      
      // Nếu đạt >= PASS_SCORE thì ghi nhận hoàn thành câu
      if (calculatedScore >= PASS_SCORE) {
        setCompletedSentenceIds(prev => new Set(prev).add(currentSentence.id));
      }
    } catch (err) {
      console.error("Lỗi lưu điểm câu Speaking:", err);
    }
  };

  // Nghe câu mẫu chuẩn qua SpeechSynthesis
  const handlePlaySample = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Trình duyệt không hỗ trợ nghe mẫu!");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH 1: DANH SÁCH CÁC CHỦ ĐỀ SPEAKING (TOPICS SELECTION)
  // =========================================================================
  if (!selectedTopic) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all mr-4 cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Speaking & Shadowing</h1>
            <p className="text-[11px] font-semibold text-slate-400">Luyện phát âm chuẩn IPA theo các chủ đề IELTS</p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-amber-500/15 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full inline-block">
                Phương pháp Shadowing
              </span>
              <h2 className="text-xl md:text-2xl font-black">Luyện tập phát âm theo ngữ cảnh từng câu</h2>
              <p className="text-xs text-amber-100 max-w-xl font-medium">
                Chọn một chủ đề để bắt đầu luyện tập. Mỗi chủ đề chứa nhiều câu tiếng Anh kèm nghĩa tiếng Việt. Đạt từ {PASS_SCORE}% trở lên để vượt qua từng câu!
              </p>
            </div>
            <div className="text-5xl shrink-0">🎙️</div>
          </div>

          {topics.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm space-y-2">
              <span className="text-4xl block mb-2">🎙️</span>
              <p className="text-xs text-slate-500 font-bold">Giáo viên chưa cập nhật chủ đề Speaking nào cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => {
                const topicSentences = topicSentencesMap[topic.id] || [];
                const totalSentences = topicSentences.length;
                const completedInTopic = topicSentences.filter(s => completedSentenceIds.has(s.id)).length;
                const isAllDone = totalSentences > 0 && completedInTopic === totalSentences;

                return (
                  <div 
                    key={topic.id} 
                    onClick={() => handleSelectTopic(topic)} 
                    className={`bg-white p-6 rounded-3xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-[0.99] ${
                      isAllDone 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-slate-200/80 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-amber-100">
                        🎙️
                      </div>
                      
                      {isAllDone ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                          {completedInTopic}/{totalSentences} Câu Đạt
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                        {topic.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {totalSentences} câu luyện nói Shadowing
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                      <span>{isAllDone ? 'Luyện tập lại' : 'Luyện phát âm ngay'}</span>
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

  // =========================================================================
  // MÀN HÌNH 2: LUYỆN TẬP TỪNG CÂU TRONG CHỦ ĐỀ (CÁCH A)
  // =========================================================================
  const currentSentence = sentences[currentIndex];
  const isPass = scoreResult >= PASS_SCORE;
  const isCurrentSentenceDone = currentSentence ? completedSentenceIds.has(currentSentence.id) : false;
  const totalSentences = sentences.length;
  const progressPercent = totalSentences > 0 
    ? Math.round((sentences.filter(s => completedSentenceIds.has(s.id)).length / totalSentences) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (recognitionRef.current && recordingState === 'recording') {
                recognitionRef.current.stop();
              }
              setSelectedTopic(null);
            }}
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              {selectedTopic.name}
            </h1>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md mt-0.5 inline-block border border-amber-200/60">
              Yêu cầu: Đúng ≥ {PASS_SCORE}% để PASS
            </span>
          </div>
        </div>

        {/* TIẾN ĐỘ TOPIC */}
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tiến trình:</span>
            <span className="text-xs font-black text-slate-800">
              Câu {currentIndex + 1} / {totalSentences}
            </span>
          </div>
          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        
        {/* THANH ĐIỀU HƯỚNG TỪNG CÂU (QUESTION TABS) */}
        <div className="w-full bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2">
            {sentences.map((sent, idx) => {
              const isDone = completedSentenceIds.has(sent.id);
              const isActive = idx === currentIndex;
              return (
                <button
                  key={sent.id}
                  onClick={() => handleSelectSentenceIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive 
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <span>Câu {idx + 1}</span>
                  {isDone && <span>✓</span>}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-bold text-slate-400 shrink-0 hidden md:block">
            {progressPercent}% Hoàn thành
          </span>
        </div>

        {/* THẺ BÀI TẬP HIỆN TẠI */}
        {currentSentence && (
          <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col space-y-6">
            
            {/* VĂN BẢN CHUẨN CẦN ĐỌC */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Câu {currentIndex + 1} chuẩn cần đọc
                  </span>
                  {isCurrentSentenceDone && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      ✓ ĐÃ ĐẠT
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => handlePlaySample(currentSentence.englishSentence)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  <span>🔊</span> Nghe Mẫu
                </button>
              </div>

              {/* Câu tiếng Anh */}
              <p className="text-lg md:text-xl font-black text-slate-900 leading-relaxed">
                "{currentSentence.englishSentence}"
              </p>

              {/* Nghĩa tiếng Việt */}
              {currentSentence.vietnameseMeaning && (
                <p className="text-xs md:text-sm text-slate-500 font-semibold italic border-t border-slate-200/60 pt-2">
                  👉 Dịch nghĩa: {currentSentence.vietnameseMeaning}
                </p>
              )}
            </div>

            {/* KHU VỰC THU ÂM & PHÂN TÍCH */}
            <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-white min-h-[280px]">
              
              {/* TRẠNG THÁI 1: SẴN SÀNG HOẶC ĐANG THU ÂM */}
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
                    {recordingState === 'recording' ? 'Đang lắng nghe... Bấm nút STOP để chấm điểm' : 'Bấm Micro để bắt đầu đọc câu này'}
                  </p>

                  {transcriptResult && (
                    <div className="w-full p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400">Giọng nói nhận diện được:</p>
                      <p className="text-xs font-bold text-slate-700 italic">"{transcriptResult}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* TRẠNG THÁI 2: ĐANG PHÂN TÍCH */}
              {recordingState === 'analyzing' && (
                <div className="flex flex-col items-center space-y-3 animate-[fadeIn_0.3s_ease-out]">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-600">Đang đối soát giọng nói và chấm tỷ lệ chính xác...</p>
                </div>
              )}

              {/* TRẠNG THÁI 3: KẾT QUẢ ĐÁNH GIÁ (FEEDBACK) */}
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

                  {/* Danh sách từ đúng / sai nguyên bản theo câu mẫu */}
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

                  {/* CÁC NÚT ĐIỀU HƯỚNG THEO CÁCH A */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button 
                      onClick={() => setRecordingState('idle')}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Thu Âm Lại Câu Này
                    </button>

                    {currentIndex < totalSentences - 1 ? (
                      <button 
                        onClick={handleNextSentence}
                        className={`flex-1 py-3.5 text-white font-bold rounded-xl text-xs shadow-lg active:scale-95 transition-all cursor-pointer ${
                          isPass 
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25' 
                            : 'bg-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        Câu Tiếp Theo ➔
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          alert("🎉 Chúc mừng bạn đã hoàn thành câu cuối cùng của chủ đề!");
                          setSelectedTopic(null);
                        }}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                      >
                        🎉 Hoàn Thành Chủ Đề
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default SpeakingShadowing;