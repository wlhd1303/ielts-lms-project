import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../services/adminService';

const StatisticsManagement = () => {
  const [activeModule, setActiveModule] = useState<string>('MOCK_TEST');
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE TÌM KIẾM VÀ SẮP XẾP
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'SCORE_DESC' | 'SCORE_ASC'>('NEWEST');

  const MODULES = [
    { key: 'MOCK_TEST', label: 'Thi thử (Mock Test)', icon: '📝' },
    { key: 'READING_VOCAB_TEST', label: 'Mini Test Từ vựng Reading', icon: '🎯' },
    { key: 'LISTENING_VOCAB_TEST', label: 'Phản xạ Listening Vocab', icon: '⚡' },
    { key: 'DICTATION', label: 'Nghe chép chính tả', icon: '🎧' },
    { key: 'VOCAB', label: 'Trắc nghiệm Từ vựng', icon: '📚' },
    { key: 'WRITING', label: 'Dịch câu Luyện viết', icon: '✍️' },
    { key: 'SPEAKING', label: 'Luyện nói Phát âm', icon: '🎙️' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [recordsRes, usersRes]: [any, any] = await Promise.all([
          adminService.getAllStudyRecords(),
          adminService.getAllUsers()
        ]);
        
        setRecords(Array.isArray(recordsRes) ? recordsRes : recordsRes?.data || []);
        setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thống kê:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getUserClass = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.studentClass?.name || 'Chưa xếp lớp';
  };

  // LOGIC TÌM KIẾM & SẮP XẾP TỰ ĐỘNG (USEMEMO TỐI ƯU HIỆU NĂNG)
  const processedRecords = useMemo(() => {
    // 1. Lọc theo kỹ năng đang chọn
    let result = records.filter(r => r.moduleType === activeModule);

    // 2. Tìm kiếm theo Tên học viên
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(r => {
        const username = r.user?.username?.toLowerCase() || '';
        return username.includes(term);
      });
    }

    // 3. Sắp xếp đa tiêu chí
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      const scoreA = Number(a.score || 0);
      const scoreB = Number(b.score || 0);

      switch (sortBy) {
        case 'NEWEST':
          return dateB - dateA; // Mới nhất lên đầu
        case 'OLDEST':
          return dateA - dateB; // Cũ nhất lên đầu
        case 'SCORE_DESC':
          return scoreB - scoreA; // Điểm cao xuống thấp
        case 'SCORE_ASC':
          return scoreA - scoreB; // Điểm thấp lên cao
        default:
          return 0;
      }
    });
  }, [records, activeModule, searchTerm, sortBy]);

  // Tất cả bản ghi thuộc module hiện tại (dùng để tính điểm trung bình tổng)
  const moduleTotalRecords = useMemo(() => {
    return records.filter(r => r.moduleType === activeModule);
  }, [records, activeModule]);

  if (isLoading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm">Đang nạp dữ liệu báo cáo thống kê...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      
      {/* SEGMENTED TAB HEADER */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/70 p-3 gap-2 overflow-x-auto shrink-0 custom-scrollbar">
        {MODULES.map(mod => (
          <button 
            key={mod.key}
            onClick={() => {
              setActiveModule(mod.key);
              setSearchTerm(''); // Reset ô tìm kiếm khi đổi module
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeModule === mod.key 
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span className="text-base">{mod.icon}</span> {mod.label}
          </button>
        ))}
      </div>

      {/* STAT METRICS BAR */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/30 border-b border-slate-100 shrink-0">
         <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
               <p className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider mb-1">Tổng lượt nộp bài</p>
               <h3 className="text-3xl font-black text-blue-900">{moduleTotalRecords.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl shadow-md shadow-blue-500/20">
              📊
            </div>
         </div>

         <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div>
               <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1">Điểm số trung bình</p>
               <h3 className="text-3xl font-black text-emerald-900">
                 {moduleTotalRecords.length > 0 
                   ? (moduleTotalRecords.reduce((acc, curr) => acc + curr.score, 0) / moduleTotalRecords.length).toFixed(1) 
                   : 0} {activeModule === 'VOCAB' ? 'câu' : '%'}
               </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl shadow-md shadow-emerald-500/20">
              🎯
            </div>
         </div>
      </div>

      {/* TOOLBAR: TÌM KIẾM & BỘ LỌC SẮP XẾP */}
      <div className="p-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Input Tìm kiếm theo tên */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm học viên theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 bg-white transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Sắp xếp & Số lượng kết quả */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          <span className="text-[11px] font-bold text-slate-400">
            Hiển thị <span className="text-slate-800 font-extrabold">{processedRecords.length}</span> / {moduleTotalRecords.length}
          </span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-white shadow-sm cursor-pointer"
          >
            <option value="NEWEST">⏱️ Mới nhất trước</option>
            <option value="OLDEST">⏳ Cũ nhất trước</option>
            <option value="SCORE_DESC">🏆 Điểm cao ➔ Thấp</option>
            <option value="SCORE_ASC">📉 Điểm thấp ➔ Cao</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="flex-1 overflow-y-auto p-6 max-h-[480px] custom-scrollbar">
        {processedRecords.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
             <span className="text-5xl opacity-60">📭</span>
             <p className="font-bold text-sm">
               {searchTerm ? `Không tìm thấy học viên nào phù hợp với từ khóa "${searchTerm}"` : "Chưa có lượt nộp bài nào cho kỹ năng này."}
             </p>
             {searchTerm && (
               <button 
                 onClick={() => setSearchTerm('')}
                 className="text-xs font-bold text-blue-600 hover:underline pt-1"
               >
                 Xóa từ khóa tìm kiếm
               </button>
             )}
          </div>
        ) : (
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3.5">Học viên</th>
                  <th className="px-5 py-3.5">Lớp</th>
                  <th className="px-5 py-3.5">Kết quả</th>
                  <th className="px-5 py-3.5">Thời gian làm bài</th>
                  <th className="px-5 py-3.5 text-right">Ngày nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {processedRecords.map(record => {
                  const date = new Date(record.createdAt);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs uppercase">
                             {record.user?.username?.charAt(0) || 'U'}
                           </div>
                           <span className="font-bold text-slate-800">{record.user?.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-500">
                        {getUserClass(record.user?.id)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] border ${
                          record.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 
                          record.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
                          'bg-rose-50 text-rose-700 border-rose-200/60'
                        }`}>
                           {activeModule === 'VOCAB' ? `${record.score} câu đúng` : `${record.score.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-500">
                        {Math.floor((record.durationSeconds || 0) / 60)}m {(record.durationSeconds || 0) % 60}s
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400 font-medium">
                        {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {date.toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsManagement;