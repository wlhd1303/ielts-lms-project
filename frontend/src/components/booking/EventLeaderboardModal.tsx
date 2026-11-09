import React, { useState, useEffect } from 'react';
import { 
  bookingService, 
  type EventLeaderboardData, 
  type EventLeaderboardItem,
  type TestEventShift 
} from '../../services/bookingService';

interface EventLeaderboardModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  shifts?: TestEventShift[];
}

export const EventLeaderboardModal: React.FC<EventLeaderboardModalProps> = ({
  eventId,
  isOpen,
  onClose,
  isAdmin = false,
  shifts = []
}) => {
  const [data, setData] = useState<EventLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | undefined>(undefined);
  const [selectedSkill, setSelectedSkill] = useState<string>('OVERALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getEventLeaderboard(eventId, selectedShiftId, selectedSkill);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải bảng xếp hạng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId) {
      fetchLeaderboard();
    }
  }, [isOpen, eventId, selectedShiftId, selectedSkill]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Visibility (Admin)
  const handleToggleVisibility = async () => {
    if (!data) return;
    try {
      setActionLoading(true);
      const nextState = !data.isPublic;
      const res = await bookingService.toggleLeaderboardVisibilityAdmin(eventId, nextState);
      setData(prev => prev ? { ...prev, isPublic: res.isPublic } : null);
      showToast(res.isPublic ? '🟢 Đã CÔNG KHAI Bảng Xếp Hạng cho học viên!' : '🔒 Đã ẨN Bảng Xếp Hạng tạm thời.');
    } catch (err: any) {
      alert('Lỗi cập nhật trạng thái: ' + (err?.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Regrade All (Admin)
  const handleRegradeAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn chấm lại toàn bộ bài thi của đợt này theo đáp án mới nhất?')) return;
    try {
      setActionLoading(true);
      const res = await bookingService.regradeAllAdmin(eventId);
      showToast(`🎉 Đã chấm lại thành công ${res.count} bài thi! Bảng điểm đã tự cập nhật.`);
      await fetchLeaderboard();
    } catch (err: any) {
      alert('Lỗi chấm lại: ' + (err?.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV (Admin)
  const handleExportCsv = async () => {
    try {
      setActionLoading(true);
      const blob = await bookingService.exportLeaderboardCsvAdmin(eventId, selectedShiftId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bang_Xep_Hang_Event_${eventId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('📥 Đã xuất file CSV thành công!');
    } catch (err: any) {
      alert('Lỗi xuất file CSV: ' + (err?.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  // Lọc theo search term
  const filteredRankings = (data?.rankings || []).filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.fullName?.toLowerCase().includes(term) ||
      item.username?.toLowerCase().includes(term) ||
      (item.phone && item.phone.includes(term))
    );
  });

  const getScoreDisplay = (item: EventLeaderboardItem) => {
    if (selectedSkill === 'READING') return item.scoreReading !== undefined ? item.scoreReading.toFixed(1) : '-';
    if (selectedSkill === 'LISTENING') return item.scoreListening !== undefined ? item.scoreListening.toFixed(1) : '-';
    return item.overallScore !== undefined ? item.overallScore.toFixed(1) : (item.scoreReading || item.scoreListening || '-');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs md:text-sm rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-4xl h-[92vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER MODAL */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xl md:text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {data?.skillType === 'BOTH' ? 'IELTS 2 Kỹ Năng' : data?.skillType === 'READING' ? 'IELTS Reading' : 'IELTS Listening'}
                </span>
                {data && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    data.isPublic ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {data.isPublic ? '🟢 Đã Công Bố' : '🔒 Đang Tạm Ẩn'}
                  </span>
                )}
              </div>
              <h2 className="text-base md:text-lg font-black text-white mt-0.5 line-clamp-1">
                Bảng Xếp Hạng: {data?.eventTitle || 'Kỳ Thi Thử IELTS'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* ADMIN ACTION TOOLBAR (NẾU LÀ ADMIN) */}
        {isAdmin && data && (
          <div className="px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">🛠️ Quản trị viên:</span>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={actionLoading}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  data.isPublic 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <span>{data.isPublic ? '🔒 Ẩn Bảng Điểm' : '🟢 Công Khai Cho Học Viên'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRegradeAll}
                disabled={actionLoading}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100/70 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Chấm lại toàn bộ thí sinh theo đáp án đúng mới nhất"
              >
                <span>🔄 Chấm Lại Toàn Bộ</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={actionLoading}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>📊 Xuất Excel/CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* BỘ LỌC CA THI & KỸ NĂNG + TÌM KIẾM */}
        <div className="p-3 md:px-5 md:py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lọc Ca Thi */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedShiftId(undefined)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedShiftId === undefined ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ca
              </button>
              {shifts.map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => setSelectedShiftId(sh.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedShiftId === sh.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sh.shiftName}
                </button>
              ))}
            </div>

            {/* Lọc Kỹ Năng nếu là thi cả 2 kỹ năng */}
            {data?.skillType === 'BOTH' && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {(['OVERALL', 'READING', 'LISTENING'] as const).map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setSelectedSkill(sk)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSkill === sk ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sk === 'OVERALL' ? 'Overall' : sk === 'READING' ? 'Reading' : 'Listening'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <input
              type="text"
              placeholder="🔍 Tìm tên thí sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-500">Đang tổng hợp điểm số và xếp hạng...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <span className="text-3xl">⚠️</span>
              <p className="text-xs font-bold text-rose-700">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer"
              >
                Tải Lại
              </button>
            </div>
          ) : !data?.isPublic && !isAdmin ? (
            /* TRẠNG THÁI ẨN BẢNG ĐIỂM DÀNH CHO HỌC VIÊN */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center text-4xl shadow-inner">
                🔒
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-black text-slate-800">Bảng Xếp Hạng Đang Được Cập Nhật</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ban giám khảo đang tổng hợp kết quả bài thi của các ca. Bảng xếp hạng chính thức sẽ được công bố ngay sau khi hoàn tất!
                </p>
              </div>

              {/* Nếu học viên đã nộp bài, vẫn hiển thị điểm cá nhân an tâm */}
              {data?.myRank && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-left w-full max-w-sm space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bài thi của bạn:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800">{data.myRank.fullName}</span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black rounded-xl text-sm border border-indigo-200">
                      Band {getScoreDisplay(data.myRank)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Đúng: <strong className="text-slate-800">{data.myRank.correctCount}/40 câu</strong> • Thời gian: <strong className="text-slate-800">{data.myRank.durationMinutes} phút</strong>
                  </div>
                </div>
              )}
            </div>
          ) : filteredRankings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-white rounded-2xl border border-slate-200">
              <span className="text-4xl opacity-50">📝</span>
              <h4 className="text-sm font-black text-slate-700">Chưa có thí sinh nộp bài</h4>
              <p className="text-xs text-slate-400 max-w-xs">Chưa có kết quả bài làm nào được ghi nhận cho ca thi hoặc bộ lọc đã chọn.</p>
            </div>
          ) : (
            <>
              {/* THỐNG KÊ NHANH (HEADER STATS) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Thí sinh nộp bài</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{data?.totalParticipants || 0}</div>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm cao nhất</div>
                  <div className="text-xl font-black text-emerald-600 mt-0.5">{data?.highestScore?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm trung bình</div>
                  <div className="text-xl font-black text-indigo-600 mt-0.5">{data?.averageScore?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Kỹ năng</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{selectedSkill}</div>
                </div>
              </div>

              {/* BỤC VINH DANH TOP 3 (PODIUM) */}
              {data?.topThree && data.topThree.length > 0 && !searchTerm.trim() && (
                <div className="pt-4 pb-2">
                  <div className="text-center mb-4">
                    <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      ✨ Bục Vinh Danh Xuất Sắc ✨
                    </span>
                  </div>

                  <div className="flex items-end justify-center gap-2 md:gap-4 max-w-xl mx-auto px-2">
                    
                    {/* HẠNG 2: Á QUÂN 1 (BẠC) */}
                    {data.topThree[1] && (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-400 p-0.5 shadow-md flex items-center justify-center relative">
                          <span className="text-xl">🥈</span>
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-slate-700 text-white text-[10px] font-black rounded-full shadow-xs">
                            #2
                          </span>
                        </div>
                        <div className="mt-2 text-center w-full">
                          <div className="text-xs font-black text-slate-800 line-clamp-1">{data.topThree[1].fullName}</div>
                          <div className="text-xs font-black text-slate-600">Band {getScoreDisplay(data.topThree[1])}</div>
                          <div className="text-[10px] text-slate-400">{data.topThree[1].correctCount}/40 • {data.topThree[1].durationMinutes}p</div>
                        </div>
                        {/* Cột bục */}
                        <div className="w-full h-20 md:h-24 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-t border-x border-slate-300 mt-2 flex items-center justify-center font-black text-slate-500 text-lg shadow-inner">
                          2
                        </div>
                      </div>
                    )}

                    {/* HẠNG 1: QUÁN QUÂN (VÀNG) */}
                    {data.topThree[0] && (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="text-xl animate-bounce">👑</div>
                        <div className="w-14 h-14 md:w-18 md:h-18 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-lg shadow-amber-500/20 flex items-center justify-center relative ring-4 ring-amber-300/40">
                          <span className="text-2xl md:text-3xl">🥇</span>
                          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-600 text-white text-[10px] font-black rounded-full shadow-xs">
                            #1
                          </span>
                        </div>
                        <div className="mt-2 text-center w-full">
                          <div className="text-xs md:text-sm font-black text-amber-950 line-clamp-1">{data.topThree[0].fullName}</div>
                          <div className="text-sm font-black text-amber-600">Band {getScoreDisplay(data.topThree[0])}</div>
                          <div className="text-[10px] text-slate-500">{data.topThree[0].correctCount}/40 • {data.topThree[0].durationMinutes}p</div>
                        </div>
                        {/* Cột bục cao nhất */}
                        <div className="w-full h-28 md:h-32 bg-gradient-to-t from-amber-200 via-amber-100 to-yellow-50 rounded-t-2xl border-t border-x border-amber-300 mt-2 flex items-center justify-center font-black text-amber-700 text-2xl shadow-inner">
                          1
                        </div>
                      </div>
                    )}

                    {/* HẠNG 3: Á QUÂN 2 (ĐỒNG) */}
                    {data.topThree[2] && (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 p-0.5 shadow-md flex items-center justify-center relative">
                          <span className="text-xl">🥉</span>
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-800 text-white text-[10px] font-black rounded-full shadow-xs">
                            #3
                          </span>
                        </div>
                        <div className="mt-2 text-center w-full">
                          <div className="text-xs font-black text-slate-800 line-clamp-1">{data.topThree[2].fullName}</div>
                          <div className="text-xs font-black text-amber-800">Band {getScoreDisplay(data.topThree[2])}</div>
                          <div className="text-[10px] text-slate-400">{data.topThree[2].correctCount}/40 • {data.topThree[2].durationMinutes}p</div>
                        </div>
                        {/* Cột bục */}
                        <div className="w-full h-16 md:h-20 bg-gradient-to-t from-amber-100 to-orange-50 rounded-t-2xl border-t border-x border-amber-200 mt-2 flex items-center justify-center font-black text-amber-800 text-lg shadow-inner">
                          3
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* BẢNG CHI TIẾT THỨ HẠNG (RANKS) */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    📋 Danh Sách Toàn Bộ Thí Sinh ({filteredRankings.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Sắp xếp theo: Điểm số ➔ Số câu đúng ➔ Thời gian nộp
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-3 text-center w-12">Hạng</th>
                        <th className="py-2.5 px-3">Thí sinh</th>
                        <th className="py-2.5 px-3">Ca thi</th>
                        <th className="py-2.5 px-3 text-center">Số câu đúng</th>
                        <th className="py-2.5 px-3 text-center">Thời gian</th>
                        <th className="py-2.5 px-3 text-right">Band Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRankings.map((item) => {
                        const isTop1 = item.rank === 1;
                        const isTop2 = item.rank === 2;
                        const isTop3 = item.rank === 3;
                        const isMe = item.isCurrentUser;

                        return (
                          <tr
                            key={item.registrationId}
                            className={`transition-colors ${
                              isMe 
                                ? 'bg-indigo-50/80 font-bold border-l-4 border-l-indigo-600' 
                                : isTop1 
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70' 
                                  : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Cột Hạng */}
                            <td className="py-3 px-3 text-center">
                              {isTop1 ? (
                                <span className="inline-block w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs leading-6 shadow-xs">
                                  1
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-block w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs leading-6 shadow-xs">
                                  2
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-block w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs leading-6 shadow-xs">
                                  3
                                </span>
                              ) : (
                                <span className="font-bold text-slate-500">#{item.rank}</span>
                              )}
                            </td>

                            {/* Cột Tên Thí Sinh */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{item.fullName}</span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-black rounded-md">
                                        BẠN
                                      </span>
                                    )}
                                  </div>
                                  {isAdmin && (item.phone || item.email) && (
                                    <div className="text-[10px] text-slate-400">
                                      {item.phone && <span>📞 {item.phone}</span>}
                                      {item.email && <span className="ml-2">✉️ {item.email}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Cột Ca Thi */}
                            <td className="py-3 px-3 text-slate-600 font-medium">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px]">
                                {item.shiftName}
                              </span>
                            </td>

                            {/* Cột Số câu đúng */}
                            <td className="py-3 px-3 text-center font-bold text-slate-700">
                              {item.correctCount}/40
                            </td>

                            {/* Cột Thời gian */}
                            <td className="py-3 px-3 text-center text-slate-500">
                              {item.durationMinutes} phút
                            </td>

                            {/* Cột Band Score */}
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2.5 py-1 rounded-xl font-black text-xs inline-block ${
                                Number(getScoreDisplay(item)) >= 8.0 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                  : Number(getScoreDisplay(item)) >= 6.5 
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                Band {getScoreDisplay(item)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PHÂN TÍCH CÂU HỎI BẪY (TOP 5 HARDEST QUESTIONS - CHỈ ADMIN HOẶC HIỂN THỊ KÈM) */}
              {isAdmin && data?.topHardestQuestions && data.topHardestQuestions.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Phân Tích Câu Hỏi Bẫy (Top câu có tỉ lệ sai cao nhất)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {data.topHardestQuestions.map((q) => (
                      <div key={`${q.skill}_${q.questionNumber}`} className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-rose-900">
                            {q.skill} — Câu #{q.questionNumber}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Sai: {q.wrongCount}/{q.totalAttempts} thí sinh
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-xs rounded-lg">
                            {q.wrongRate}% sai
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* THANH GHIM VỊ TRÍ CỦA TÔI (STICKY MY RANK BAR) */}
        {data?.myRank && data.isPublic && (
          <div className="p-3 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between px-4 md:px-6 shrink-0 border-t border-indigo-800 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📌</span>
              <div>
                <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Vị trí của bạn:</div>
                <div className="text-xs md:text-sm font-black text-white">
                  Hạng #{data.myRank.rank} / {data.totalParticipants} thí sinh • {data.myRank.correctCount}/40 câu đúng • {data.myRank.durationMinutes} phút
                </div>
              </div>
            </div>

            <div className="px-3 py-1 bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm">
              Band {getScoreDisplay(data.myRank)} ⭐
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EventLeaderboardModal;
