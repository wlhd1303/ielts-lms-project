import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { dictationService } from '../../services/dictationService';
import { adminService } from '../../services/adminService';

type ViewState = 'LOADING' | 'TOPIC_SELECTION' | 'PLAYING' | 'FINISHED';

const DictationPlayer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const streakAudioId = searchParams.get('streakAudioId');

  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Trạng thái màn hình
  const [viewState, setViewState] = useState<ViewState>('LOADING');
  const [topics, setTopics] = useState<any[]>([]);
  const [completedAudioIds, setCompletedAudioIds] = useState<Set<number>>(new Set());
  const [topicAudioMap, setTopicAudioMap] = useState<Record<number, number[]>>({});
  
  // Trạng thái bài học
  const [currentTopicName, setCurrentTopicName] = useState<string>('');
  const [currentAudioId, setCurrentAudioId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  
  // Trạng thái nộp bài
  const [startTime, setStartTime] = useState<number>(0);
  const [userInputs, setUserInputs] = useState<Record<number, string>>({});
  const [submitResult, setSubmitResult] = useState<any>(null);

  // 1. KHI VỪA VÀO TRANG: LOAD DANH SÁCH CHỦ ĐỀ, AUDIO VÀ DỮ LIỆU BÀI ĐÃ HOÀN THÀNH
  useEffect(() => {
    const fetchTopicsAndRecords = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); 
          return navigate('/dashboard');
        }

        // ⚡ 1. Lấy lịch sử nộp bài của học viên (Danh sách Audio ID đã nộp)[cite: 8]
        const recordsRes: any = await adminService.getRecentActivities();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneAudioSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'DICTATION' && r.user?.id === userData.id)
            .map((r: any) => Number(r.refId))
        );
        setCompletedAudioIds(doneAudioSet);

        // ⚡ 2. Lấy danh sách Topics[cite: 12]
        const res: any = await dictationService.getTopicsByClass(classId);
        const topicList = Array.isArray(res) ? res : (res?.data || []);
        setTopics(topicList);

        // ⚡ 3. Quét lấy mảng Audio ID thuộc về từng Topic để đối soát chính xác[cite: 12]
        const tAudioMap: Record<number, number[]> = {};
        for (const t of topicList) {
          try {
            const audiosRes: any = await dictationService.getAudiosByTopic(t.id);
            const audios = Array.isArray(audiosRes) ? audiosRes : (audiosRes?.data || []);
            tAudioMap[t.id] = audios.map((a: any) => a.id);

            // ⚡ Mở bài trực tiếp nếu tới từ nút Streak trên Dashboard
            if (streakAudioId) {
              const targetAudioId = Number(streakAudioId);
              const found = audios.find((a: any) => a.id === targetAudioId);
              if (found) {
                await handleStartAudioDirect(t.name, found.id, found.audioUrl || found.audio_url);
                return;
              }
            }
          } catch (e) {
            tAudioMap[t.id] = [];
          }
        }
        setTopicAudioMap(tAudioMap);

        setViewState('TOPIC_SELECTION');
      } catch (error) {
        navigate('/dashboard');
      }
    };
    fetchTopicsAndRecords();
  }, [navigate, streakAudioId]);

  const handleStartAudioDirect = async (topicName: string, audioId: number, url: string) => {
    try {
      const questionsRes: any = await dictationService.getQuestionsByAudio(audioId);
      const qs = Array.isArray(questionsRes) ? questionsRes : (questionsRes?.data || []);
      if (qs.length === 0) {
        alert("Chưa có đoạn cắt cho bài nghe này!"); 
        return setViewState('TOPIC_SELECTION');
      }
      setCurrentTopicName(topicName);
      setCurrentAudioId(audioId);
      setAudioUrl(url);
      setQuestions(qs);
      setUserInputs({});
      setStartTime(Date.now());
      setViewState('PLAYING');
    } catch (e) {
      setViewState('TOPIC_SELECTION');
    }
  };

  // 2. KHI CHỌN CHỦ ĐỀ
  const handleStartTopic = async (topicId: number, topicName: string) => {
    setViewState('LOADING');
    try {
      const audiosRes: any = await dictationService.getAudiosByTopic(topicId);
      const audios = Array.isArray(audiosRes) ? audiosRes : (audiosRes?.data || []);
      if (audios.length === 0) {
        alert("Chủ đề này chưa có bài nghe!"); 
        return setViewState('TOPIC_SELECTION');
      }
      await handleStartAudioDirect(topicName, audios[0].id, audios[0].audioUrl || audios[0].audio_url);
    } catch (error) {
      alert("Lỗi tải dữ liệu bài học!"); 
      setViewState('TOPIC_SELECTION');
    }
  };

  // 3. TÍNH NĂNG: TUA AUDIO THEO ĐOẠN CẮT (TIMESTAMP)
  const playSegment = (start: number, end: number, index: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      audioRef.current.play();
      setCurrentPlayingIndex(index);
      
      const checkTime = setInterval(() => {
        if (audioRef.current && audioRef.current.currentTime >= end) {
          audioRef.current.pause();
          setCurrentPlayingIndex(null);
          clearInterval(checkTime);
        }
      }, 100);
    }
  };

  // 4. KHI BẤM NỘP BÀI
  const handleSubmit = async () => {
    if (!window.confirm("Bạn đã điền xong và muốn nộp bài?")) return;
    
    setViewState('LOADING');
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const res: any = await dictationService.submitDictation(currentAudioId!, userInputs, duration);
      setSubmitResult(res?.data || res);

      // ⚡ Tự động cập nhật Audio ID vừa làm vào Set hoàn thành
      if (currentAudioId) {
        setCompletedAudioIds(prev => new Set(prev).add(currentAudioId));
      }

      setViewState('FINISHED');
    } catch (error) {
      alert("Lỗi nộp bài!"); 
      setViewState('PLAYING');
    }
  };

  // --- GIAO DIỆN 1: ĐANG TẢI DỮ LIỆU ---
  if (viewState === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Đang chuẩn bị bài nghe...</span>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN 2: CHỌN CHỦ ĐỀ NGHE (SỬA ĐỐI SOÁT KEY ĐỂ HIỂN THỊ CỜ DONE) ---
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
            <h1 className="text-base font-black text-slate-900 tracking-tight">Dictation Topics</h1>
            <p className="text-[11px] font-semibold text-slate-400">Chọn chủ đề luyện tập nghe chép chính tả</p>
          </div>
        </header>
        
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {topics.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm">
              <span className="text-4xl mb-3 block">🎧</span>
              <p className="text-xs text-slate-500 font-bold">Chưa có bài luyện nghe nào cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((t) => {
                // ⚡ Kiểm tra xem có ít nhất 1 Audio thuộc Topic này nằm trong danh sách bài đã làm hay chưa
                const topicAudios = topicAudioMap[t.id] || [];
                const isDone = topicAudios.some(audioId => completedAudioIds.has(audioId));

                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleStartTopic(t.id, t.name)} 
                    className={`bg-white p-6 rounded-3xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-[0.99] ${
                      isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-emerald-100">
                        🎧
                      </div>

                      {/* ⚡ HIỂN THỊ CỜ DONE RÕ RÀNG */}
                      {isDone ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                          Sẵn sàng
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">{t.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">Luyện phản xạ nghe chi tiết từng câu</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                      <span>{isDone ? 'Luyện tập lại' : 'Bắt đầu bài học'}</span>
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

  // --- GIAO DIỆN 3: MÀN HÌNH FINISHED ---
  if (viewState === 'FINISHED') {
    const accuracy = Math.round(submitResult?.score || 0);

    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center p-4 md:p-8 animate-[fadeIn_0.3s_ease-out]">
        <audio ref={audioRef} src={audioUrl} />

        <div className="w-full max-w-3xl space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/80 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              🎉
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hoàn Thành Bài Nghe!</h2>
            <p className="text-slate-400 text-xs font-semibold mt-1">Chi tiết kết quả bài làm của bạn</p>

            <div className="flex justify-center gap-4 mt-6">
              <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl w-36 shadow-sm">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Độ chính xác</p>
                <p className="text-3xl font-black text-emerald-700">{accuracy}%</p>
              </div>
              <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl w-36 shadow-sm">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Thời gian</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{submitResult?.durationSeconds || 0}s</p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setViewState('TOPIC_SELECTION')} 
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                ← Chọn Chủ Đề Khác
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <span>🔍</span> Bảng so sánh kết quả ({questions.length} đoạn)
            </h3>

            {questions.map((q, index) => {
              const userInput = (userInputs[q.id] || '').trim();
              const transcript = q.transcript || '';
              const isPlayingThis = currentPlayingIndex === index;

              const startTimestamp = q.startTime ?? q.start_time ?? 0;
              const endTimestamp = q.endTime ?? q.end_time ?? 0;

              return (
                <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2.5 py-1 rounded-md uppercase">
                        Đoạn #{index + 1}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        ({startTimestamp}s - {endTimestamp}s)
                      </span>
                    </div>

                    <button 
                      onClick={() => playSegment(startTimestamp, endTimestamp, index)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                        isPlayingThis 
                          ? 'bg-amber-500 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {isPlayingThis ? '⏸️ Đang phát...' : '🔊 Nghe lại đoạn này'}
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                        ✓ Đáp án chính xác (Transcript)
                      </span>
                      <p className="font-bold text-slate-800 text-xs md:text-sm leading-relaxed">
                        {transcript}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        ✍️ Bài gõ của bạn
                      </span>
                      <p className={`font-semibold text-xs md:text-sm leading-relaxed ${userInput ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                        {userInput || '(Bạn đã bỏ trống đoạn này)'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN CHÍNH: LÀM BÀI ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      <audio ref={audioRef} src={audioUrl} />

      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { if(window.confirm("Thoát bài làm sẽ không lưu lại kết quả?")) setViewState('TOPIC_SELECTION'); }}
            className="p-2 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">{currentTopicName}</h1>
            <p className="text-[10px] text-blue-600 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded-md mt-0.5">
              {questions.length} Đoạn nghe
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-6">
          <div className="flex items-start gap-3 bg-amber-50/80 p-4 rounded-2xl border border-amber-200/60 shadow-sm">
            <span className="text-amber-500 text-xl mt-0.5">💡</span>
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Mẹo làm bài</p>
              <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
                Bấm nút Play ở từng câu để nghe đoạn audio tương ứng. Gõ chính xác từ bạn nghe được. Không cần quá bận tâm viết hoa/thường hay dấu câu.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => {
              const isPlayingThis = currentPlayingIndex === index;
              const textValue = userInputs[q.id] || '';
              
              const startTimestamp = q.startTime ?? q.start_time ?? 0;
              const endTimestamp = q.endTime ?? q.end_time ?? 0;
              const duration = endTimestamp - startTimestamp;

              return (
                <div key={q.id} className={`bg-white rounded-3xl shadow-sm border transition-all p-6 ${isPlayingThis ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/80'}`}>
                  <div className="bg-slate-50/80 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center gap-4 border border-slate-200/60">
                    <button 
                      onClick={() => playSegment(startTimestamp, endTimestamp, index)}
                      className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 ${
                        isPlayingThis 
                          ? 'bg-amber-500 shadow-amber-500/30' 
                          : 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700'
                      }`}
                    >
                      {isPlayingThis ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        '▶'
                      )}
                    </button>

                    <div className="flex-1 w-full flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 font-mono">00:{startTimestamp.toString().padStart(2, '0')}</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                        <div 
                           className={`absolute top-0 left-0 h-full rounded-full ${isPlayingThis ? 'bg-amber-500 w-full' : 'bg-blue-500 w-0'}`}
                           style={{ transition: isPlayingThis ? `width ${duration}s linear` : 'none' }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">00:{endTimestamp.toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={textValue}
                      onChange={(e) => setUserInputs({...userInputs, [q.id]: e.target.value})}
                      placeholder="Gõ chính xác những gì bạn nghe được vào đây..."
                      className={`w-full h-28 bg-white border-2 rounded-2xl p-4 text-slate-800 text-xs md:text-sm leading-relaxed focus:outline-none transition-all resize-none placeholder-slate-300 font-medium ${
                        textValue.length > 0 ? 'border-blue-200 bg-blue-50/10' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {textValue.length} ký tự
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 pb-10">
            <button 
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-[0.98] transition-all text-xs"
            >
              Nộp Bài Lấy Điểm & Xem Đáp Án
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DictationPlayer;