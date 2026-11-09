import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../services/axiosClient';
import { bookingService, type TestEvent } from '../../services/bookingService';
import EventLeaderboardModal from '../../components/booking/EventLeaderboardModal';

interface LeaderboardItem {
  username: string;
  totalScore: number;
}

const LeaderboardScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'practice' | 'events'>('practice');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>([]);
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Modal Bảng Xếp Hạng Kỳ Thi Thử
  const [selectedEvent, setSelectedEvent] = useState<TestEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const userRole = localStorage.getItem('role') || '';
  const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res: any = await axiosClient.get('/api/records/leaderboard');
        const rawData = Array.isArray(res) ? res : res.data || [];
        
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

  useEffect(() => {
    if (activeTab === 'events' && events.length === 0) {
      const fetchEvents = async () => {
        try {
          setLoadingEvents(true);
          const data = await bookingService.getOpenEvents();
          setEvents(data);
        } catch (e) {
          console.error("Lỗi tải danh sách kỳ thi thử:", e);
        } finally {
          setLoadingEvents(false);
        }
      };
      fetchEvents();
    }
  }, [activeTab]);

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
      <header className="bg-white border-b border-slate-200/80 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all group cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Bảng Vàng Thành Tích</h1>
            <p className="text-xs text-slate-400 font-semibold hidden md:block">Cập nhật tổng điểm thi đua học tập & thứ hạng kỳ thi theo thời gian thực</p>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'practice'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚡</span>
            <span>Luyện Tập Cá Nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🏆</span>
            <span>Kỳ Thi Thử IELTS</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
        {activeTab === 'practice' ? (
          /* TAB 1: LUYỆN TẬP CÁ NHÂN */
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
        ) : (
          /* TAB 2: BẢNG XẾP HẠNG CÁC KỲ THI THỬ */
          <div className="max-w-4xl w-full mx-auto space-y-4">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Kỳ Thi Thử IELTS
                </span>
                <h3 className="text-base md:text-lg font-black mt-1">Bảng Xếp Hạng & Điểm Thi Trực Tuyến</h3>
                <p className="text-xs text-amber-100 font-medium">Chọn một kỳ thi thử bên dưới để theo dõi bục vinh danh và thứ hạng chi tiết.</p>
              </div>
              <span className="text-4xl hidden sm:block">🏆</span>
            </div>

            {loadingEvents ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-500">Đang tải danh sách kỳ thi...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <span className="text-4xl opacity-50">📅</span>
                <h4 className="text-sm font-black text-slate-700">Chưa có kỳ thi thử nào</h4>
                <p className="text-xs text-slate-400">Các đợt thi thử sẽ xuất hiện tại đây khi được mở.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                          📅 {new Date(ev.eventDate).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {ev.examFormat === 'ONLINE' ? '🌐 Thi Online' : '🏫 Thi Trực Tiếp'}
                        </span>
                        {ev.skillType && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                            {ev.skillType === 'LISTENING' ? 'Listening' : ev.skillType === 'READING' ? 'Reading' : 'Full 2 Kỹ Năng'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900 leading-snug line-clamp-2">
                        {ev.title}
                      </h4>

                      {ev.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-bold">
                        {ev.shifts?.length || 0} ca thi
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(ev);
                          setShowEventModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🏆 Xem Bảng Xếp Hạng</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL BẢNG XẾP HẠNG ĐỢT THI THỬ */}
      {selectedEvent && (
        <EventLeaderboardModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          isAdmin={isAdmin}
          shifts={selectedEvent.shifts}
        />
      )}

    </div>
  );
};

export default LeaderboardScreen;
