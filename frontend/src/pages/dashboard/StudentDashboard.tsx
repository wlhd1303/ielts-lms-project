import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const [studentInfo, setStudentInfo] = useState({
    username: "Đang tải...",
    className: "Đang chờ xếp lớp",
    examDate: "31/05/2025",
    isLocked: true,
    activeFeatures: [] as string[] 
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response: any = await authService.getProfile();
        
        // In ra màn hình Console để xem chính xác Backend trả về cấu trúc thế nào
        console.log("DỮ LIỆU PROFILE TỪ API:", response); 

        // Lưới lọc 3 lớp: Bất chấp Axios bọc bao nhiêu chữ "data", ta vẫn chọc tới lõi
        const userData = response?.data?.data || response?.data || response;
        
        const isUserLocked = !userData.studentClass;
        
        // ĐÃ SỬA: Thêm điều kiện p.active để bắt đúng định dạng JSON của Spring Boot
        const grantedFeatures = userData.permissions 
          ? userData.permissions.filter((p: any) => p.active || p.isActive || p.is_active).map((p: any) => p.feature_key || p.featureKey)
          : [];

        setStudentInfo({
          // Đào tìm username ở mọi định dạng có thể có
          username: userData.username || userData.userName || userData.name || "Học viên",
          className: userData.studentClass ? userData.studentClass.name : "Đang chờ xếp lớp", 
          examDate: "31/05/2025",
          isLocked: isUserLocked,
          activeFeatures: grantedFeatures
        });
      } catch (error) {
        console.error("Lỗi lấy thông tin:", error);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const checkLocked = (featureKey: string) => {
    if (studentInfo.isLocked) return true;
    return !studentInfo.activeFeatures.includes(featureKey);
  };

  const isMockTestLocked = checkLocked('MOCK_TEST');
  const isDictationLocked = checkLocked('DICTATION');
  const isVocabLocked = checkLocked('VOCAB');
  const isSpeakingLocked = checkLocked('SPEAKING');
  const isWritingLocked = checkLocked('WRITING');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      
      {/* --- Sidebar --- */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-100 flex flex-col hidden md:flex shrink-0 h-screen sticky top-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/30">
            T
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">Thầy Thành</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-semibold transition-all">
            <span className="text-xl">🏠</span> Tổng quan
          </button>
          <button 
            onClick={() => !studentInfo.isLocked && navigate('/leaderboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${studentInfo.isLocked ? 'text-gray-400 opacity-50 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <span className="text-xl">🏆</span> Bảng xếp hạng
          </button>
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${studentInfo.isLocked ? 'text-gray-400 opacity-50 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
            <span className="text-xl">📚</span> Lịch sử làm bài
          </button>
        </nav>

        {/* Khu vực thông tin & Đăng xuất */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xl uppercase">
                {studentInfo?.username?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 uppercase">{studentInfo.username}</p>
              <button onClick={handleLogout} className="text-xs font-medium text-gray-500 hover:text-red-500 cursor-pointer transition-colors mt-0.5 text-left">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Chào mừng, <span className="text-blue-600 uppercase">{studentInfo.username}</span> 👋
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Tiếp tục hành trình chinh phục IELTS của bạn nhé!</p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Mục tiêu thi chính thức</p>
              <p className="text-lg font-black text-gray-800">{studentInfo.examDate}</p>
            </div>
          </div>
        </header>

        {/* --- KHU VỰC THÔNG BÁO KHÓA TÀI KHOẢN --- */}
        {studentInfo.isLocked && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 shadow-sm animate-[fadeIn_0.5s_ease-out]">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl shrink-0">
              🔒
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-800">Tài khoản đang chờ duyệt</h3>
              <p className="text-amber-700 font-medium text-sm mt-1">
                Bạn chưa được Thầy Thành xếp lớp. Các tính năng học tập sẽ bị khóa cho đến khi Admin phê duyệt.
              </p>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          Lộ trình: <span className={studentInfo.isLocked ? "text-amber-600" : "text-blue-600"}>{studentInfo.className}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card Mock Test */}
          <div 
            onClick={() => !isMockTestLocked && navigate('/mock-test')}
            className={`group bg-white p-6 rounded-3xl border relative overflow-hidden ${isMockTestLocked ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale-[30%]' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 cursor-pointer'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              📝
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
              Mock Test
              {isMockTestLocked && <span className="text-gray-400 text-sm">🔒</span>}
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Đề thi thật Reading & Listening mô phỏng môi trường thi.</p>
          </div>

          {/* Card Dictation */}
          <div 
            onClick={() => !isDictationLocked && navigate('/dictation')}
            className={`group bg-white p-6 rounded-3xl border relative overflow-hidden ${isDictationLocked ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale-[30%]' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-200 transition-all duration-300 cursor-pointer'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              🎧
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
              Dictation
              {isDictationLocked && <span className="text-gray-400 text-sm">🔒</span>}
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Luyện nghe chép chính tả bám sát nội dung bài học.</p>
          </div>

          {/* Card Vocabulary */}
          <div 
            onClick={() => !isVocabLocked && navigate('/vocabulary')}
            className={`group bg-white p-6 rounded-3xl border relative overflow-hidden ${isVocabLocked ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale-[30%]' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-purple-200 transition-all duration-300 cursor-pointer'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              📚
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
              Vocabulary
              {isVocabLocked && <span className="text-gray-400 text-sm">🔒</span>}
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Trắc nghiệm từ vựng 4 lựa chọn có hỗ trợ phát âm tự động.</p>
          </div>
          
          {/* Card Speaking */}
          <div 
            onClick={() => !isSpeakingLocked && navigate('/speaking')}
            className={`group bg-white p-6 rounded-3xl border relative overflow-hidden ${isSpeakingLocked ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale-[30%]' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-orange-200 transition-all duration-300 cursor-pointer'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              🎙️
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
              Speaking
              {isSpeakingLocked && <span className="text-gray-400 text-sm">🔒</span>}
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Thu âm và phân tích lỗi sai IPA trực tiếp từ AI.</p>
          </div>

          {/* Card Writing */}
          <div 
            onClick={() => !isWritingLocked && navigate('/writing')}
            className={`group bg-white p-6 rounded-3xl border relative overflow-hidden ${isWritingLocked ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale-[30%]' : 'border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 cursor-pointer'}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
              ✍️
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex justify-between items-center">
              Writing
              {isWritingLocked && <span className="text-gray-400 text-sm">🔒</span>}
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Dịch câu tiếng Việt sang tiếng Anh sử dụng Keywords.</p>
          </div>

        </div>

      </main>

      {/* --- Thanh Điều Hướng Dưới Đáy (Mobile Only) --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around p-3 pb-safe z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button className="flex flex-col items-center gap-1 text-blue-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
          <span className="text-xl">🏆</span>
          <span className="text-[10px] font-bold">Rank</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-800 transition-colors">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default StudentDashboard;