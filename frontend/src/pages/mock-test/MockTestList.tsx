import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { mockTestService } from '../../services/mockTestService';

const MockTestList = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData.studentClass?.id;

        if (!classId) {
          alert("Bạn chưa được xếp lớp!"); return navigate('/dashboard');
        }

        const res: any = await mockTestService.getTestsByClass(classId);
        setMockTests(Array.isArray(res) ? res : (res?.data || []));
      } catch (error) {
        console.error("Lỗi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTests();
  }, [navigate]);

  const handleStartTest = () => {
    if (selectedTest) navigate(`/mock-test/${selectedTest.id}`);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="text-gray-500 font-bold">Đang tải đề thi...</span></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 sticky top-0">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all mr-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Thư viện Mock Test</h1>
          <p className="text-xs text-gray-500 font-medium">Chọn một đề thi để bắt đầu làm bài</p>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto">
        {mockTests.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center shadow-sm">
            <span className="text-5xl mb-4 block">📝</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa có đề thi nào</h2>
            <p className="text-gray-500">Giáo viên chưa tải đề thi lên cho lớp của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTests.map((test) => (
              <div key={test.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${test.type === 'READING' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {test.type === 'READING' ? '📖' : '🎧'}
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600">Sẵn sàng</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">{test.title}</h3>
                <p className="text-sm font-semibold text-gray-400 mb-6">{test.type} MODULE</p>
                
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1"><span className="text-lg">⏱️</span> 60 phút</div>
                  <div className="w-[1px] h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-1"><span className="text-lg">📝</span> 40 câu</div>
                </div>
                
                <button onClick={() => setSelectedTest(test)} className="mt-auto w-full py-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold rounded-xl transition-colors">
                  Xem chi tiết
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Chuẩn bị vào phòng thi</h3>
              <button onClick={() => setSelectedTest(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-black text-blue-600 mb-2">{selectedTest.title}</h4>
              <p className="text-gray-600 font-medium mb-6">Bạn đã sẵn sàng để bắt đầu chưa? Thời gian sẽ được tính ngay khi bạn bấm nút xác nhận.</p>
              <ul className="space-y-3 mb-8 bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm font-medium text-amber-800">
                <li className="flex gap-2"><span>⚠️</span> Không làm mới (F5) trình duyệt khi đang thi.</li>
                <li className="flex gap-2"><span>⚠️</span> Bài thi sẽ tự động nộp khi hết 60 phút.</li>
              </ul>
              <div className="flex gap-3">
                <button onClick={() => setSelectedTest(null)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                <button onClick={handleStartTest} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all">Bắt đầu làm bài</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTestList;