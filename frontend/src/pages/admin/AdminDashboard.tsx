import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import các sub-components
import UserManagement from './UserManagement';
import VocabManagement from './VocabManagement';
import DictationManagement from './DictationManagement';
import MockTestManagement from './MockTestManagement';
import StatisticsManagement from './StatisticsManagement';
import WritingManagement from './WritingManagement';
import SpeakingManagement from './SpeakingManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentMenu, setCurrentMenu] = useState<'dashboard' | 'vocab' | 'dictation' | 'mocktest' | 'statistics' | 'writing' | 'speaking'>('dashboard');

  const menuTitles: Record<string, { title: string; desc: string }> = {
    dashboard: { title: 'Quản lý Học viên & Xếp lớp', desc: 'Duyệt tài khoản, phân lớp và theo dõi chuỗi bài tập Streak' },
    vocab: { title: 'Ngân hàng Từ vựng', desc: 'Quản lý chủ đề và bộ từ vựng trắc nghiệm' },
    dictation: { title: 'Dữ liệu Nghe chép chính tả', desc: 'Quản lý bài luyện Listening Dictation theo lớp' },
    mocktest: { title: 'Thư viện Đề Thi (Mock Test)', desc: 'Tạo và cấu hình đề thi thử Reading & Listening' },
    statistics: { title: 'Thống kê & Lịch sử học tập', desc: 'Báo cáo tổng quan tiến độ làm bài của học viên' },
    writing: { title: 'Quản lý Bài tập Writing', desc: 'Cấu hình bài tập dịch câu và từ khóa gợi ý' },
    speaking: { title: 'Quản lý Bài tập Speaking', desc: 'Cấu hình bài tập đọc đoạn văn phát âm Shadowing' }
  };

  const navItems = [
    { section: 'Hệ thống' },
    { key: 'dashboard', label: 'Quản lý Học viên', icon: '📊' },
    { key: 'statistics', label: 'Thống kê tiến độ', icon: '📈' },
    { section: 'Kho dữ liệu' },
    { key: 'vocab', label: 'Quản lý Từ vựng', icon: '📚' },
    { key: 'dictation', label: 'Quản lý Nghe chép', icon: '🎧' },
    { key: 'mocktest', label: 'Quản lý Thi thử', icon: '📝' },
    { key: 'writing', label: 'Quản lý Luyện viết', icon: '✍️' },
    { key: 'speaking', label: 'Quản lý Luyện nói', icon: '🎙️' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800">
      
      {/* --- SIDEBAR NAV --- */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0 border-r border-slate-800 shadow-xl">
        
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg mr-3.5 shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            A
          </div>
          <div>
            <span className="text-base font-black text-white tracking-wide block leading-none">IELTS LMS</span>
            <span className="text-[11px] font-bold text-blue-400 tracking-wider uppercase mt-1 block">Admin Portal</span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={idx} className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-6 mb-2 px-3">
                  {item.section}
                </div>
              );
            }
            const isActive = currentMenu === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentMenu(item.key as any)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute right-3 w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer / Logout */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80">
          <button 
            onClick={() => { localStorage.clear(); navigate('/login'); }} 
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-all text-slate-400 group"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-base group-hover:rotate-12 transition-transform">🚪</span>
              Đăng xuất hệ thống
            </span>
            <span className="text-[10px] bg-slate-800 group-hover:bg-rose-500/20 text-slate-400 group-hover:text-rose-300 px-2 py-0.5 rounded-md font-mono">
              ESC
            </span>
          </button>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {menuTitles[currentMenu]?.title}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {menuTitles[currentMenu]?.desc}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3.5 pl-5 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">Thầy Thành</p>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50 inline-block mt-1">
                  ● Admin Online
                </span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-md shadow-indigo-500/20 border-2 border-white">
                T
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {currentMenu === 'dashboard' && <UserManagement />}
          {currentMenu === 'statistics' && <StatisticsManagement />}
          {currentMenu === 'vocab' && <VocabManagement />}
          {currentMenu === 'dictation' && <DictationManagement />}
          {currentMenu === 'mocktest' && <MockTestManagement />}
          {currentMenu === 'writing' && <WritingManagement />}
          {currentMenu === 'speaking' && <SpeakingManagement />}
        </div>
      </main>

    </div>
  );
};

export default AdminDashboard;