import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const StatisticsManagement = () => {
  const [activeModule, setActiveModule] = useState<string>('MOCK_TEST');
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const MODULES = [
    { key: 'MOCK_TEST', label: 'Thi thử (Mock Test)', icon: '📝' },
    { key: 'DICTATION', label: 'Nghe chép (Dictation)', icon: '🎧' },
    { key: 'VOCAB', label: 'Từ vựng (Vocab)', icon: '📚' },
    { key: 'WRITING', label: 'Viết (Writing)', icon: '✍️' },
    { key: 'SPEAKING', label: 'Nói (Speaking)', icon: '🎙️' }
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

  // Map user ID ra tên Lớp để hiển thị
  const getUserClass = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user?.studentClass?.name || 'Chưa xếp lớp';
  };

  // Lọc records theo tab hiện tại
  const filteredRecords = records.filter(r => r.moduleType === activeModule);

  if (isLoading) return <div className="p-10 text-center text-gray-500 font-medium">Đang tải dữ liệu thống kê...</div>;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      
      {/* --- HEADER TABS --- */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 pt-4 overflow-x-auto shrink-0">
        {MODULES.map(mod => (
          <button 
            key={mod.key}
            onClick={() => setActiveModule(mod.key)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeModule === mod.key ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-[0_-4px_6px_rgba(0,0,0,0.02)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-xl'}`}
          >
            <span className="text-lg">{mod.icon}</span> {mod.label}
          </button>
        ))}
      </div>

      {/* --- THỐNG KÊ TỔNG QUAN CỦA TAB HIỆN TẠI --- */}
      <div className="p-6 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white border-b border-gray-50">
         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Tổng lượt nộp bài</p>
               <h3 className="text-2xl font-black text-blue-700">{filteredRecords.length}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600">📊</div>
         </div>
         <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Điểm trung bình</p>
               <h3 className="text-2xl font-black text-green-700">
                 {filteredRecords.length > 0 
                   ? (filteredRecords.reduce((acc, curr) => acc + curr.score, 0) / filteredRecords.length).toFixed(1) 
                   : 0} {activeModule === 'VOCAB' ? 'câu' : '%'}
               </h3>
            </div>
            <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-600">🎯</div>
         </div>
      </div>

      {/* --- BẢNG CHI TIẾT --- */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {filteredRecords.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
             <span className="text-5xl mb-4">📭</span>
             <p className="font-medium text-lg">Chưa có bài nộp nào cho chức năng này.</p>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold border-b border-gray-100">Học viên</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100">Lớp học</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100">Điểm số</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100">Thời gian làm</th>
                  <th className="px-6 py-4 font-bold border-b border-gray-100">Ngày nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredRecords.map(record => {
                  const date = new Date(record.createdAt);
                  return (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold uppercase">
                             {record.user?.username?.charAt(0) || 'U'}
                           </div>
                           <span className="font-bold text-gray-800">{record.user?.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-600">
                        {getUserClass(record.user?.id)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg font-bold ${record.score >= 80 ? 'bg-green-100 text-green-700' : record.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                           {activeModule === 'VOCAB' ? `${record.score} câu đúng` : `${record.score.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500">
                        {Math.floor(record.durationSeconds / 60)}p {record.durationSeconds % 60}s
                      </td>
                      <td className="px-6 py-4 text-gray-500">
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