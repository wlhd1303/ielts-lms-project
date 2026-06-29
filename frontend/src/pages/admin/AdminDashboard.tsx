import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import các sub-components đã tách
import UserManagement from './UserManagement';
import VocabManagement from './VocabManagement';
import DictationManagement from './DictationManagement';
import MockTestManagement from './MockTestManagement';
import StatisticsManagement from './StatisticsManagement';
import WritingManagement from './WritingManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentMenu, setCurrentMenu] = useState<'dashboard' | 'vocab' | 'dictation' | 'mocktest' | 'statistics' | 'writing'>('dashboard');

  const menuTitles = {
    dashboard: 'Quản lý Học viên & Xếp lớp',
    vocab: 'Ngân hàng Từ vựng',
    dictation: 'Dữ liệu Nghe chép chính tả',
    mocktest: 'Thư viện Đề Thi (Mock Test)',
    statistics: 'Thống kê & Lịch sử học tập',
    writing: 'Quản lý Bài tập Writing'
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-black mr-3 shadow-lg shadow-blue-500/20">A</div>
          <span className="text-lg font-bold text-white tracking-wider">LMS ADMIN</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 mt-2 px-2">Hệ thống</div>
          <button onClick={() => setCurrentMenu('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'dashboard' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>📊</span> Quản lý Học viên</button>
          
          <button onClick={() => setCurrentMenu('statistics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'statistics' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>📈</span> Thống kê tiến độ</button>

          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 mt-8 px-2">Kho dữ liệu</div>
          <button onClick={() => setCurrentMenu('vocab')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'vocab' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>📖</span> Quản lý Từ vựng</button>
          <button onClick={() => setCurrentMenu('dictation')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'dictation' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>🎧</span> Quản lý Nghe chép</button>
          <button onClick={() => setCurrentMenu('mocktest')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'mocktest' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>📝</span> Quản lý Thi thử</button>
          
          {/* NÚT WRITING ĐÃ ĐƯỢC CHUYỂN LÊN ĐÂY VÀ ĐỒNG BỘ UI */}
          <button onClick={() => setCurrentMenu('writing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${currentMenu === 'writing' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}><span>✍️</span> Quản lý Luyện viết</button>
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors text-slate-400"><span>🚪</span> Đăng xuất</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">{menuTitles[currentMenu]}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block"><p className="text-sm font-bold text-gray-800">Thầy Thành</p></div>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">T</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentMenu === 'dashboard' && <UserManagement />}
          {currentMenu === 'statistics' && <StatisticsManagement />}
          {currentMenu === 'vocab' && <VocabManagement />}
          {currentMenu === 'dictation' && <DictationManagement />}
          {currentMenu === 'mocktest' && <MockTestManagement />}
          {currentMenu === 'writing' && <WritingManagement />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;