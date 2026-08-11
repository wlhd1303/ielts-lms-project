import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../services/axiosClient';

interface LeaderboardItem {
  username: string;
  totalScore: number;
}

const LeaderboardScreen = () => {
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res: any = await axiosClient.get('/api/records/leaderboard');
        const rawData = Array.isArray(res) ? res : res.data || [];
        
        // Mảng trả về dạng Object[]: [ [username, totalScore], ... ]
        const formatted = rawData.map((item: any) => ({
          username: item[0] || 'Học viên',
          totalScore: Math.round((item[1] || 0) * 10) / 10
        }));

        setLeaderboardData(formatted);
      } catch (error) {
        console.error("Lỗi lấy bảng xếp hạng:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const renderMedal = (rank: number) => {
    switch (rank) {
      case 1: 
        return <span className="text-3xl filter drop-shadow-sm">🥇</span>;
      case 2: 
        return <span className="text-3xl filter drop-shadow-sm">🥈</span>;
      case 3: 
        return <span className="text-3xl filter drop-shadow-sm">🥉</span>;
      default: 
        return (
          <span className="text-sm font-black text-slate-400 bg-slate-100/80 w-8 h-8 flex items-center justify-center rounded-xl font-mono">
            {rank}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all group cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Bảng Vàng Thành Tích</h1>
            <p className="text-xs text-slate-400 font-semibold hidden md:block">Cập nhật tổng điểm thi đua học tập theo thời gian thực</p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
        <div className="max-w-4xl w-full mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm flex-1 flex flex-col overflow-hidden">
          
          <div className="overflow-x-auto flex-1 p-2 custom-scrollbar">
            {leaderboardData.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-semibold text-xs">Chưa có dữ liệu bảng xếp hạng.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 text-[11px] uppercase font-black tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4 rounded-tl-2xl w-20 text-center">Hạng</th>
                    <th className="px-6 py-4">Học viên</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Tổng điểm tích lũy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leaderboardData.map((student, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-blue-50/40 transition-colors ${
                          rank === 1 ? 'bg-amber-50/30' :
                          rank === 2 ? 'bg-slate-50/40' :
                          rank === 3 ? 'bg-orange-50/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center">
                            {renderMedal(rank)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-md shrink-0 uppercase ${
                              rank === 1 ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 shadow-amber-500/20' : 
                              rank === 2 ? 'bg-gradient-to-tr from-slate-400 to-slate-500 shadow-slate-500/20' : 
                              rank === 3 ? 'bg-gradient-to-tr from-orange-400 to-amber-600 shadow-orange-500/20' : 
                              'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
                            }`}>
                              {student.username.charAt(0)}
                            </div>
                            <p className="font-extrabold text-slate-900 text-xs md:text-sm">
                              {student.username}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className={`text-base font-black px-3 py-1 rounded-xl inline-block ${
                            rank === 1 
                              ? 'text-blue-700 bg-blue-50 border border-blue-200/60' 
                              : 'text-slate-800'
                          }`}>
                            {student.totalScore} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>

    </div>
  );
};

export default LeaderboardScreen;