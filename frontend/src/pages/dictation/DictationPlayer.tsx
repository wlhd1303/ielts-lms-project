import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { dictationService } from '../../services/dictationService';

type ViewState = 'LOADING' | 'TOPIC_SELECTION' | 'PLAYING' | 'FINISHED';

const DictationPlayer = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Trạng thái màn hình
  const [viewState, setViewState] = useState<ViewState>('LOADING');
  const [topics, setTopics] = useState<any[]>([]);
  
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

  // 1. KHI VỪA VÀO TRANG: LOAD DANH SÁCH CHỦ ĐỀ
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); return navigate('/dashboard');
        }

        const res: any = await dictationService.getTopicsByClass(classId);
        setTopics(Array.isArray(res) ? res : (res?.data || []));
        setViewState('TOPIC_SELECTION');
      } catch (error) {
        navigate('/dashboard');
      }
    };
    fetchTopics();
  }, [navigate]);

  // 2. KHI CHỌN CHỦ ĐỀ: LOAD AUDIO VÀ CÁC ĐOẠN CẮT
  const handleStartTopic = async (topicId: number, topicName: string) => {
    setViewState('LOADING');
    try {
      const audiosRes: any = await dictationService.getAudiosByTopic(topicId);
      const audios = Array.isArray(audiosRes) ? audiosRes : (audiosRes?.data || []);
      
      if (audios.length === 0) {
        alert("Chủ đề này chưa có bài nghe!"); return setViewState('TOPIC_SELECTION');
      }

      const audio = audios[0]; 
      const questionsRes: any = await dictationService.getQuestionsByAudio(audio.id);
      const qs = Array.isArray(questionsRes) ? questionsRes : (questionsRes?.data || []);

      if (qs.length === 0) {
        alert("Chưa có đoạn cắt nào cho bài nghe này!"); return setViewState('TOPIC_SELECTION');
      }

      setCurrentTopicName(topicName);
      setCurrentAudioId(audio.id);
      setAudioUrl(audio.audioUrl || audio.audio_url);
      setQuestions(qs);
      setUserInputs({});
      setStartTime(Date.now());
      setViewState('PLAYING');
    } catch (error) {
      alert("Lỗi tải dữ liệu bài học!"); setViewState('TOPIC_SELECTION');
    }
  };

  // 3. TÍNH NĂNG: TUA AUDIO THEO ĐOẠN CẮT (TIMESTAMP)
  const playSegment = (start: number, end: number, index: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      audioRef.current.play();
      setCurrentPlayingIndex(index);
      
      // Auto pause khi hết đoạn time
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
      const res = await dictationService.submitDictation(currentAudioId!, userInputs, duration);
      setSubmitResult(res);
      setViewState('FINISHED');
    } catch (error) {
      alert("Lỗi nộp bài!"); setViewState('PLAYING');
    }
  };


  // --- GIAO DIỆN 1: ĐANG TẢI DỮ LIỆU ---
  if (viewState === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // --- GIAO DIỆN 2: CHỌN CHỦ ĐỀ NGHE ---
  if (viewState === 'TOPIC_SELECTION') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm z-10">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Dictation Topics</h1>
            <p className="text-xs text-gray-500 font-medium">Chọn bài tập nghe chép chính tả</p>
          </div>
        </header>
        
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {topics.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center shadow-sm">
              <span className="text-5xl mb-4 block">🎧</span>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa có bài tập nào</h2>
              <p className="text-gray-500">Giáo viên chưa thêm bài nghe cho lớp của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((t) => (
                <div key={t.id} onClick={() => handleStartTopic(t.id, t.name)} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl mb-4 shadow-sm">🎧</div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{t.name}</h3>
                  <div className="mt-4 flex items-center text-sm font-bold text-blue-600">Bắt đầu <span className="ml-2 group-hover:translate-x-1 transition-transform">➔</span></div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- GIAO DIỆN 3: KẾT QUẢ ---
  if (viewState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-[fadeIn_0.5s_ease-out]">
          <div className="w-24 h-24 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">🎉</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Hoàn thành!</h2>
          <p className="text-gray-500 mb-8 font-medium">Bạn đã hoàn thành xuất sắc bài chép chính tả.</p>
          
          <div className="flex justify-center gap-6 mb-10">
            <div className="bg-green-50 p-4 rounded-2xl w-32 shadow-sm">
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Độ chính xác</p>
              <p className="text-3xl font-black text-green-700">{Math.round(submitResult?.score || 0)}%</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl w-32 shadow-sm">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Thời gian</p>
              <p className="text-3xl font-black text-blue-700">{submitResult?.durationSeconds || 0}s</p>
            </div>
          </div>
          <button onClick={() => setViewState('TOPIC_SELECTION')} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all">Làm bài khác</button>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN CHÍNH: LÀM BÀI ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* Header tối giản */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { if(window.confirm("Thoát sẽ không lưu bài?")) setViewState('TOPIC_SELECTION'); }}
            className="p-2 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">{currentTopicName}</h1>
            <p className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded-md mt-1">
              {questions.length} Đoạn cắt
            </p>
          </div>
        </div>
        
        <button className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-2">
          <span>Báo lỗi</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-4 md:p-8 overflow-y-auto">
        
        {/* Nguồn Audio tổng (ẩn đi) */}
        <audio ref={audioRef} src={audioUrl} />

        <div className="w-full max-w-3xl">
          
          {/* Gợi ý (Hint) */}
          <div className="flex items-start gap-3 mb-6 bg-amber-50 p-4 rounded-2xl border border-amber-100/50 shadow-sm">
            <span className="text-amber-500 text-xl mt-0.5">💡</span>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Mẹo làm bài</p>
              <p className="text-sm text-amber-900 font-medium">Bấm vào biểu tượng Play ở từng ô để nghe lại đoạn audio tương ứng. Gõ chính xác những gì bạn nghe được. Không cần quan tâm viết hoa/thường hay dấu câu.</p>
            </div>
          </div>

          {/* Danh sách các đoạn cắt cần nhập */}
          <div className="space-y-6 mb-8">
            {questions.map((q, index) => {
              const isPlayingThis = currentPlayingIndex === index;
              const textValue = userInputs[q.id] || '';
              
              // ĐÃ SỬA LỖI TRẮNG MÀN HÌNH TẠI ĐÂY: Dùng ?? thay cho ||
              const startTimestamp = q.startTime ?? q.start_time ?? 0;
              const endTimestamp = q.endTime ?? q.end_time ?? 0;
              const duration = endTimestamp - startTimestamp;

              return (
                <div key={q.id} className={`bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.04)] border transition-colors p-6 ${isPlayingThis ? 'border-blue-300' : 'border-gray-100'}`}>
                  
                  {/* Custom Audio Player Mini cho từng đoạn */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center gap-4 border border-gray-100">
                    
                    {/* Play/Pause Button */}
                    <button 
                      onClick={() => playSegment(startTimestamp, endTimestamp, index)}
                      className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${isPlayingThis ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700'}`}
                    >
                      {isPlayingThis ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>

                    {/* Progress Bar Simulator */}
                    <div className="flex-1 w-full flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 font-mono">00:{startTimestamp.toString().padStart(2, '0')}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                        <div 
                           className={`absolute top-0 left-0 h-full rounded-full ${isPlayingThis ? 'bg-amber-500 w-full' : 'bg-blue-500 w-0'}`}
                           style={{ transition: isPlayingThis ? `width ${duration}s linear` : 'none' }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 font-mono">00:{endTimestamp.toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* Typing Area */}
                  <div className="relative">
                    <textarea 
                      value={textValue}
                      onChange={(e) => setUserInputs({...userInputs, [q.id]: e.target.value})}
                      placeholder="Gõ chính xác những gì bạn nghe được vào đây..."
                      className={`w-full h-32 bg-white border-2 rounded-2xl p-5 text-gray-800 text-lg leading-relaxed focus:outline-none transition-all resize-none placeholder-gray-300 font-medium ${textValue.length > 0 ? 'border-blue-200 bg-blue-50/10' : 'border-gray-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10'}`}
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      {textValue.length} ký tự
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <button className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
              Cần trợ giúp?
            </button>
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Nộp Bài Lấy Điểm
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default DictationPlayer;