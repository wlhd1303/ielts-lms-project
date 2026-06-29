import React from 'react';
import { useNavigate } from 'react-router-dom';

const LeaderboardScreen = () => {
  const navigate = useNavigate();

  const leaderboardData = [
    { rank: 1, name: "La Hoàng Đại Phong", className: "IELTS Nâng Cao", score: 9.0, correct: "40/40", time: "45p 12s", date: "Hôm nay" },
    { rank: 2, name: "Nguyễn Lê Tuấn", className: "IELTS Nâng Cao", score: 8.5, correct: "38/40", time: "48p 00s", date: "Hôm nay" },
    { rank: 3, name: "Trần Mai Anh", className: "IELTS Nền Tảng", score: 8.0, correct: "35/40", time: "50p 30s", date: "Hôm qua" },
    { rank: 4, name: "Lý Hải", className: "IELTS Nâng Cao", score: 7.5, correct: "33/40", time: "55p 15s", date: "Hôm qua" },
    { rank: 5, name: "Phạm Thảo", className: "IELTS Nền Tảng", score: 6.5, correct: "28/40", time: "59p 40s", date: "2 ngày trước" },
  ];

  const renderMedal = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-3xl drop-shadow-md">🥇</span>;
      case 2: return <span className="text-3xl drop-shadow-md">🥈</span>;
      case 3: return <span className="text-3xl drop-shadow-md">🥉</span>;
      default: return <span className="text-xl font-black text-gray-400 bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
          >
            <svg className="w-6 h-6 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Bảng Vàng Thành Tích</h1>
            <p className="text-xs text-gray-500 font-medium hidden md:block">Cập nhật thời gian thực từ hệ thống</p>
          </div>
        </div>
        
        <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold outline-none cursor-pointer">
          <option>Tuần này</option>
          <option>Tháng này</option>
          <option>Tất cả</option>
        </select>
      </header>

      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
        
        <div className="max-w-6xl w-full mx-auto bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col overflow-hidden">
          
          <div className="overflow-x-auto flex-1 p-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase font-black tracking-wider border-b border-gray-100">
                  <th className="px-6 py-5 rounded-tl-2xl w-20 text-center">Hạng</th>
                  <th className="px-6 py-5 w-64 min-w-[200px]">Học viên</th>
                  <th className="px-6 py-5 hidden md:table-cell">Lớp học</th>
                  <th className="px-6 py-5 text-center">Điểm số</th>
                  <th className="px-6 py-5 text-center hidden sm:table-cell">Số câu đúng</th>
                  <th className="px-6 py-5 hidden lg:table-cell text-right">Thời gian</th>
                  <th className="px-6 py-5 rounded-tr-2xl text-right hidden lg:table-cell">Ngày nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaderboardData.map((student) => (
                  <tr 
                    key={student.rank} 
                    className={`hover:bg-blue-50/50 transition-colors group ${student.rank <= 3 ? 'bg-orange-50/20' : ''}`}
                  >
                    <td className="px-6 py-4 flex justify-center items-center h-full mt-2">
                      {renderMedal(student.rank)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${student.rank === 1 ? 'bg-yellow-400' : student.rank === 2 ? 'bg-gray-400' : student.rank === 3 ? 'bg-orange-400' : 'bg-blue-600'}`}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 whitespace-normal line-clamp-2 md:whitespace-nowrap">{student.name}</p>
                          <p className="text-xs text-gray-500 md:hidden mt-0.5">{student.className}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-600 font-medium">
                      <span className="bg-gray-100 px-3 py-1 rounded-full">{student.className}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-black ${student.rank === 1 ? 'text-blue-600' : 'text-gray-800'}`}>
                        {student.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center hidden sm:table-cell text-sm font-semibold text-gray-600">
                      {student.correct}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-right text-sm text-gray-500 font-medium">
                      {student.time}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-right text-sm text-gray-400">
                      {student.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default LeaderboardScreen;