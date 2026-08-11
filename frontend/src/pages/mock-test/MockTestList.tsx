import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { mockTestService } from '../../services/mockTestService';
import { adminService } from '../../services/adminService';

const MockTestList = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [completedTestIds, setCompletedTestIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // STATE CHO MÀN HÌNH TEST TỪ VỰNG CHỜ ÔN TẬP
  const [pendingQuiz, setPendingQuiz] = useState<any[]>([]);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  useEffect(() => {
    const fetchTestsAndHistory = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); 
          return navigate('/dashboard');
        }

        // ⚡ Lấy lịch sử nộp bài Mock Test của học viên
        const recordsRes: any = await adminService.getRecentActivities();
        const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
        const doneSet = new Set<number>(
          records
            .filter((r: any) => r.moduleType === 'MOCK_TEST' && r.user?.id === userData.id)
            .map((r: any) => r.refId)
        );
        setCompletedTestIds(doneSet);

        const res: any = await mockTestService.getTestsByClass(classId);
        setMockTests(Array.isArray(res) ? res : (res?.data || []));
      } catch (error) {
        console.error("Lỗi tải thư viện đề thi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTestsAndHistory();
  }, [navigate]);

  // Xử lý kiểm tra từ vựng trước khi cho làm đề Reading mới
  const handleStartTest = async () => {
    if (!selectedTest) return;

    if (selectedTest.type === 'READING') {
      try {
        setIsLoading(true);
        const res: any = await mockTestService.getPendingVocabularies();
        const quizData = Array.isArray(res) ? res : (res?.data || []);

        if (quizData && quizData.length > 0) {
          setPendingQuiz(quizData);
          setQuizAnswers({});
          setQuizStartTime(Date.now());
          setIsQuizModalOpen(true);
          setSelectedTest(null); // Đóng modal xác nhận thi cũ
          return;
        }
      } catch (error) {
        console.error("Lỗi kiểm tra từ vựng chờ test:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // Nếu không có từ vựng chờ test hoặc là đề Listening -> Cho vào làm đề trực tiếp
    navigate(`/mock-test/${selectedTest.id}`);
  };

  // Nộp bài Test từ vựng
  const handleSubmitVocabQuiz = async () => {
    setIsSubmittingQuiz(true);
    try {
      let correctCount = 0;
      pendingQuiz.forEach((q) => {
        if (quizAnswers[q.id] === q.correctAnswer) {
          correctCount++;
        }
      });

      const score = pendingQuiz.length > 0 ? (correctCount / pendingQuiz.length) * 100 : 0;
      const durationSeconds = Math.floor((Date.now() - quizStartTime) / 1000);

      await mockTestService.submitVocabTest(score, durationSeconds);
      setIsQuizModalOpen(false);
      
      // Sau khi nộp xong -> Chuyển ngay tới bài Reading mới
      if (selectedTest) {
        navigate(`/mock-test/${selectedTest.id}`);
      }
    } catch (error) {
      alert("Lỗi nộp bài test từ vựng!");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Đang tải dữ liệu phòng thi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative text-slate-800">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all mr-4"
        >
          ←
        </button>
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">Thư viện Mock Test</h1>
          <p className="text-[11px] font-semibold text-slate-400">Chọn đề thi mô phỏng để kiểm tra trình độ</p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto">
        {mockTests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm space-y-3">
            <span className="text-4xl block">📝</span>
            <h2 className="text-base font-black text-slate-900">Chưa có đề thi nào</h2>
            <p className="text-xs font-semibold text-slate-400">Giáo viên chưa cập nhật đề thi thử cho lớp của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTests.map((test) => {
              const isReading = test.type === 'READING';
              const isDone = completedTestIds.has(test.id);

              return (
                <div 
                  key={test.id} 
                  className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group ${
                    isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/80 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border ${
                      isReading 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {isReading ? '📖' : '🎧'}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        isReading ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {test.type}
                      </span>

                      {/* ⚡ BADGE ĐÃ HOÀN THÀNH (DONE) */}
                      {isDone && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {test.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>⏱️</span> 60 phút
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <span>📝</span> 40 câu hỏi
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedTest(test)} 
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                  >
                    {isDone ? 'Thi Lại Đề Này' : 'Xem Chi Tiết Đề Thi'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: XÁC NHẬN VÀO PHÒNG THI */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-[slideUp_0.3s_ease-out]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900">Xác Nhận Vào Phòng Thi</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Module: {selectedTest.type}</p>
              </div>
              <button 
                onClick={() => setSelectedTest(null)} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 rounded-full transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-lg font-extrabold text-blue-600 mb-1">{selectedTest.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Thời gian làm bài sẽ được tính ngược ngay khi bạn bấm nút xác nhận. Hãy đảm bảo kết nối mạng ổn định.
                </p>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl space-y-2 text-xs font-semibold text-amber-900">
                <p className="flex items-center gap-2">
                  <span>⚠️</span> Không tải lại (F5) trang khi đang trong tiến trình làm bài.
                </p>
                <p className="flex items-center gap-2">
                  <span>⚠️</span> Hệ thống sẽ tự động thu bài khi đồng hồ về 00:00.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSelectedTest(null)} 
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button 
                  onClick={handleStartTest} 
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
                >
                  Bắt Đầu Làm Bài
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KIỂM TRA TỪ VỰNG READING CŨ (TRẮC NGHIỆM 4 LỰA CHỌN) */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-amber-50/60 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-black text-amber-900 flex items-center gap-2">
                  <span>🎯</span> Ôn Tập Từ Vựng Bài Reading Trước
                </h3>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">
                  Hãy hoàn thành bài trắc nghiệm từ vựng này trước khi bước vào đề thi Reading mới
                </p>
              </div>
              <span className="bg-amber-200/80 text-amber-900 font-black text-xs px-3 py-1 rounded-xl">
                {pendingQuiz.length} Từ Vựng
              </span>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar bg-slate-50/50">
              {pendingQuiz.map((q, idx) => (
                <div key={q.id || idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 bg-amber-100 text-amber-800 font-black rounded-lg text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-extrabold text-slate-900">
                      Nghĩa của từ <span className="text-blue-600 font-black uppercase underline decoration-blue-300">{q.englishWord}</span> là gì?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt: string, optIdx: number) => {
                      const isSelected = quizAnswers[q.id] === opt;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt })}
                          className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.01]'
                              : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitVocabQuiz}
                disabled={isSubmittingQuiz}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                {isSubmittingQuiz ? "Đang lưu kết quả..." : "Nộp Bài Ôn Tập & Vào Đề Thi ➔"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MockTestList;