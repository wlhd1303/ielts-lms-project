import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { streakService } from '../../services/streakService';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const [studentInfo, setStudentInfo] = useState({
    username: "Đang tải...",
    className: "Đang chờ xếp lớp",
    examDate: "31/05/2026",
    isLocked: true,
    activeFeatures: [] as string[] 
  });

  const [streakData, setStreakData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfileAndStreak = async () => {
      try {
        const response: any = await authService.getProfile();
        const userData = response?.data?.data || response?.data || response;
        
        const isUserLocked = !userData.studentClass;
        
        const grantedFeatures = userData.permissions 
          ? userData.permissions.filter((p: any) => p.active || p.isActive || p.is_active).map((p: any) => p.feature_key || p.featureKey)
          : [];

        setStudentInfo({
          username: userData.username || userData.userName || userData.name || "Học viên",
          className: userData.studentClass ? userData.studentClass.name : "Đang chờ xếp lớp", 
          examDate: "31/05/2026",
          isLocked: isUserLocked,
          activeFeatures: grantedFeatures
        });

        if (!isUserLocked) {
          try {
            const streakRes: any = await streakService.getTodayStreak();
            const streakPayload = streakRes?.data || streakRes;
            setStreakData(streakPayload);
          } catch (streakErr) {
            console.error("Lỗi khi tải dữ liệu Streak:", streakErr);
          }
        }

      } catch (error) {
        console.error("Lỗi lấy thông tin học viên:", error);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndStreak();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const checkLocked = (featureKey: string) => {
    if (studentInfo.isLocked) return true;
    return !studentInfo.activeFeatures.includes(featureKey);
  };

  // Kiểm tra khóa các tính năng
  const isMockTestLocked = checkLocked('MOCK_TEST');
  const isDictationLocked = checkLocked('DICTATION');
  const isVocabLocked = checkLocked('VOCAB');
  const isListeningVocabLocked = checkLocked('LISTENING_VOCAB') && checkLocked('VOCAB'); 
  const isSpeakingLocked = checkLocked('SPEAKING');
  const isWritingLocked = checkLocked('WRITING');

  // ⚡ ĐÃ CẬP NHẬT: Mở thẳng màn hình làm bài chi tiết của bài tập Streak
  const handleGoToStreakExercise = () => {
    if (!streakData || !streakData.moduleType) return;
    
    const exerciseId = streakData.exercise?.id;
    
    const modulePathMap: Record<string, string> = {
      'DICTATION': exerciseId ? `/dictation?streakAudioId=${exerciseId}` : '/dictation',
      'VOCAB': exerciseId ? `/vocabulary?streakTopicId=${exerciseId}` : '/vocabulary',
      'LISTENING_VOCAB_TEST': exerciseId ? `/listening-vocab/${exerciseId}` : '/listening-vocab',
      'SPEAKING': exerciseId ? `/speaking?streakLessonId=${exerciseId}` : '/speaking',
      'WRITING': exerciseId ? `/writing?streakPromptId=${exerciseId}` : '/writing',
      'MOCK_TEST': exerciseId ? `/mock-test/${exerciseId}?fromStreak=true` : '/mock-test'
    };

    const targetPath = modulePathMap[streakData.moduleType] || '/dashboard';
    navigate(targetPath);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Đang khởi tạo không gian học tập...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col md:flex-row text-slate-800">
      
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200/80 flex flex-col hidden md:flex shrink-0 h-screen sticky top-0 shadow-sm">
        <div className="h-20 px-8 flex items-center gap-3.5 border-b border-slate-100">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
            T
          </div>
          <div>
            <span className="text-base font-black text-slate-900 tracking-tight block leading-none">Thầy Thành</span>
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mt-1">IELTS LMS Portal</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button className="w-full flex items-center gap-3.5 px-4 py-3 bg-blue-50/80 text-blue-700 rounded-2xl font-bold text-xs transition-all shadow-sm">
            <span className="text-base">🏠</span> Tổng quan Lộ trình
          </button>
          
          <button 
            onClick={() => !studentInfo.isLocked && navigate('/leaderboard')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
              studentInfo.isLocked ? 'text-slate-300 opacity-60 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-base">🏆</span> Bảng Xếp Hạng
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm uppercase shadow-sm shrink-0">
                {studentInfo?.username?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 uppercase truncate">{studentInfo.username}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{studentInfo.className}</p>
              </div>
            </div>

            <button onClick={handleLogout} title="Đăng xuất" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0 cursor-pointer">
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Chào mừng, <span className="text-blue-600 uppercase">{studentInfo.username}</span> 👋
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">Tiếp tục hành trình chinh phục mục tiêu IELTS của bạn nhé!</p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 shrink-0">
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              🎯
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mục tiêu thi chính thức</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">{studentInfo.examDate}</p>
            </div>
          </div>
        </header>

        {studentInfo.isLocked && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 shadow-sm animate-[fadeIn_0.3s_ease-out]">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🔒
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900">Tài khoản đang chờ xếp lớp</h3>
              <p className="text-amber-800/90 font-medium text-xs mt-0.5 leading-relaxed">
                Bạn chưa được Thầy Thành phê duyệt vào lớp học. Các tính năng luyện tập sẽ tự động mở khóa sau khi tài khoản được xếp lớp.
              </p>
            </div>
          </div>
        )}

        {!studentInfo.isLocked && streakData && (
          <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-5 z-10">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-inner shrink-0">
                <span className="text-2xl md:text-3xl">🔥</span>
                <span className="text-xs font-black mt-0.5">{streakData.currentStreak} ngày</span>
              </div>
              
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg md:text-xl font-black tracking-tight">Thử Thách Lộ Trình 80 Ngày</h3>
                  <span className="bg-blue-600/90 text-white text-[11px] font-black px-3 py-0.5 rounded-full">
                    Ngày {streakData.currentDayIndex} / 80
                  </span>
                </div>
                
                <p className="text-slate-300 text-xs mt-1.5 font-medium leading-relaxed max-w-xl">
                  {streakData.completedToday 
                    ? "🎉 Tuyệt vời! Bạn đã hoàn thành nhiệm vụ Streak hôm nay. Hãy tiếp tục giữ vững phong độ vào ngày mai nhé!" 
                    : `Nhiệm vụ hôm nay: Vượt qua 1 bài tập thử thách thuộc kỹ năng ${
                        streakData.moduleType === 'MOCK_TEST' ? 'Thi Thử (Mock Test) 📝' :
                        streakData.moduleType === 'DICTATION' ? 'Nghe Chép Chính Tả 🎧' :
                        streakData.moduleType === 'VOCAB' ? 'Trắc Nghiệm Từ Vựng 📚' :
                        streakData.moduleType === 'LISTENING_VOCAB_TEST' ? 'Kiểm Tra Phản Xạ Listening ⚡' :
                        streakData.moduleType === 'SPEAKING' ? 'Luyện Nói Phát Âm 🎙️' : 'Dịch Câu Luyện Viết ✍️'
                      }`}
                </p>
              </div>
            </div>

            <div className="z-10 shrink-0 w-full md:w-auto flex justify-end">
              {!streakData.completedToday && streakData.exercise ? (
                <button 
                  onClick={handleGoToStreakExercise}
                  className="w-full md:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 font-extrabold rounded-2xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer text-white"
                >
                  Vào Làm Bài Ngay ➔
                </button>
              ) : !streakData.completedToday && !streakData.exercise ? (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-xl font-bold">
                  Lớp học hiện đã hết bài tập mới!
                </span>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-5 py-3 rounded-2xl font-bold text-xs">
                  <span>✓</span> Đã Hoàn Thành Hôm Nay
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            Lớp học: <span className={studentInfo.isLocked ? "text-amber-600" : "text-blue-600"}>{studentInfo.className}</span>
          </h2>
          
          {/* GRID 6 CARD KỸ NĂNG */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            
            {/* Card 1: Mock Test */}
            <div 
              onClick={() => !isMockTestLocked && navigate('/mock-test')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isMockTestLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-blue-100">
                  📝
                </div>
                {isMockTestLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Môi trường thi</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">Mock Test</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Đề thi thật Reading & Listening mô phỏng chuẩn giao diện thi.</p>
              </div>
            </div>

            {/* Card 2: Dictation */}
            <div 
              onClick={() => !isDictationLocked && navigate('/dictation')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isDictationLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
                  🎧
                </div>
                {isDictationLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">Nghe chép</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">Dictation</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Luyện nghe chép chính tả chính xác từng từ bám sát bài học.</p>
              </div>
            </div>

            {/* Card 3: Vocabulary */}
            <div 
              onClick={() => !isVocabLocked && navigate('/vocabulary')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isVocabLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-purple-100">
                  📚
                </div>
                {isVocabLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">Từ vựng</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">Vocabulary</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Trắc nghiệm từ vựng phản xạ nhanh theo các chủ đề IELTS.</p>
              </div>
            </div>

            {/* Card 4: Listening Vocab */}
            <div 
              onClick={() => !isListeningVocabLocked && navigate('/listening-vocab')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isListeningVocabLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-amber-100">
                  ⚡
                </div>
                {isListeningVocabLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">Phản xạ nghe</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">Listening Vocab</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Kiểm tra phản xạ từ vựng nghe tốc độ 5 giây/câu.</p>
              </div>
            </div>

            {/* Card 5: Speaking */}
            <div 
              onClick={() => !isSpeakingLocked && navigate('/speaking')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isSpeakingLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
                  🎙️
                </div>
                {isSpeakingLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">Luyện nói IPA</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">Speaking</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Thu âm shadowing và phân tích độ chuẩn phát âm chuẩn IPA.</p>
              </div>
            </div>

            {/* Card 6: Writing */}
            <div 
              onClick={() => !isWritingLocked && navigate('/writing')}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${
                isWritingLocked 
                  ? 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed' 
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300 cursor-pointer active:scale-[0.99] group'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-rose-100">
                  ✍️
                </div>
                {isWritingLocked ? (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-lg">🔒 Đang khóa</span>
                ) : (
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">Dịch câu</span>
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors">Writing</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Luyện dịch câu tiếng Việt sang tiếng Anh chuẩn Keywords & Cấu trúc.</p>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around p-2.5 pb-safe z-50 shadow-lg">
        <button className="flex flex-col items-center gap-1 text-blue-600 font-bold p-1 cursor-pointer">
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Lộ trình</span>
        </button>
        
        <button 
          onClick={() => !studentInfo.isLocked && navigate('/leaderboard')} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-800 font-bold p-1 transition-colors cursor-pointer"
        >
          <span className="text-lg">🏆</span>
          <span className="text-[10px]">Xếp hạng</span>
        </button>
        
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-rose-600 font-bold p-1 transition-colors cursor-pointer"
        >
          <span className="text-lg">🚪</span>
          <span className="text-[10px]">Thoát</span>
        </button>
      </div>

    </div>
  );
};

export default StudentDashboard;