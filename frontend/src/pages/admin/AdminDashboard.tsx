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
import CycleManagement from './CycleManagement';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentMenu, setCurrentMenu] = useState<'dashboard' | 'vocab' | 'dictation' | 'mocktest' | 'statistics' | 'writing' | 'speaking' | 'cycle'>('dashboard');
  
  // ⚡ TỐI ƯU HIỆU NĂNG: Giữ các tab đã mở trong bộ nhớ để chuyển tab tức thì 0 giây (Keep-Alive)
  const [visitedMenus, setVisitedMenus] = useState<Set<string>>(new Set(['dashboard']));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectMenu = (menuKey: any) => {
    setCurrentMenu(menuKey);
    setIsMobileMenuOpen(false);
    setVisitedMenus((prev) => {
      if (prev.has(menuKey)) return prev;
      const next = new Set(prev);
      next.add(menuKey);
      return next;
    });
  };

  const menuTitles: Record<string, { title: string; desc: string }> = {
    dashboard: { title: 'Quản lý Học viên & Xếp lớp', desc: 'Duyệt tài khoản, phân lớp và theo dõi chuỗi bài tập Streak' },
    vocab: { title: 'Ngân hàng Từ vựng', desc: 'Quản lý chủ đề và bộ từ vựng trắc nghiệm' },
    dictation: { title: 'Dữ liệu Nghe chép chính tả', desc: 'Quản lý bài luyện Listening Dictation theo lớp' },
    mocktest: { title: 'Thư viện Đề Thi (Mock Test)', desc: 'Tạo và cấu hình đề thi thử Reading & Listening' },
    statistics: { title: 'Thống kê & Lịch sử học tập', desc: 'Báo cáo tổng quan tiến độ làm bài của học viên' },
    cycle: { title: 'Quản lý Vòng học (Study Cycles)', desc: 'Cấu hình lộ trình xen kẽ Reading & Listening, chuẩn bị kỹ năng trước khi Mock Test' },
    writing: { title: 'Quản lý Bài tập Writing', desc: 'Cấu hình bài tập dịch câu và từ khóa gợi ý' },
    speaking: { title: 'Quản lý Bài tập Speaking', desc: 'Cấu hình bài tập đọc đoạn văn phát âm Shadowing' }
  };

  const navItems = [
    { section: 'Hệ thống' },
    { key: 'dashboard', label: 'Quản lý Học viên', icon: '📊' },
    { key: 'statistics', label: 'Thống kê tiến độ', icon: '📈' },
    { section: 'Lộ trình đào tạo' },
    { key: 'cycle', label: 'Quản lý Vòng học', icon: '🔄' },
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
                onClick={() => handleSelectMenu(item.key as any)}
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
            onClick={() => { localStorage.clear(); sessionStorage.clear(); navigate('/login'); }} 
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

      {/* --- MOBILE DRAWER OVERLAY --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-slate-900 text-slate-300 z-50 flex flex-col md:hidden transform transition-transform duration-300 shadow-2xl ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-20 flex items-center justify-between px-6 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black mr-3">
              A
            </div>
            <div>
              <span className="text-sm font-black text-white block">IELTS LMS</span>
              <span className="text-[10px] font-bold text-blue-400 uppercase">Admin Portal</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white text-lg p-1.5"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={idx} className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4 mb-1.5 px-3">
                  {item.section}
                </div>
              );
            }
            const isActive = currentMenu === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectMenu(item.key as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950/90 border-t border-slate-800">
          <button 
            onClick={() => { localStorage.clear(); sessionStorage.clear(); navigate('/login'); }} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <span>🚪</span> Đăng xuất hệ thống
          </button>
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Mở menu quản trị"
            >
              <span className="text-xl">☰</span>
            </button>

            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                {menuTitles[currentMenu]?.title}
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5 hidden sm:block">
                {menuTitles[currentMenu]?.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3.5 pl-3 md:pl-5 border-l border-slate-200">
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

        {/* Dynamic Content Body (Keep-Alive: giữ các màn hình đã mở để chuyển qua lại tức thì) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className={currentMenu === 'dashboard' ? 'block' : 'hidden'}>
            {visitedMenus.has('dashboard') && <UserManagement />}
          </div>
          <div className={currentMenu === 'statistics' ? 'block' : 'hidden'}>
            {visitedMenus.has('statistics') && <StatisticsManagement />}
          </div>
          <div className={currentMenu === 'vocab' ? 'block' : 'hidden'}>
            {visitedMenus.has('vocab') && <VocabManagement />}
          </div>
          <div className={currentMenu === 'dictation' ? 'block' : 'hidden'}>
            {visitedMenus.has('dictation') && <DictationManagement />}
          </div>
          <div className={currentMenu === 'cycle' ? 'block' : 'hidden'}>
            {visitedMenus.has('cycle') && <CycleManagement />}
          </div>
          <div className={currentMenu === 'mocktest' ? 'block' : 'hidden'}>
            {visitedMenus.has('mocktest') && <MockTestManagement />}
          </div>
          <div className={currentMenu === 'writing' ? 'block' : 'hidden'}>
            {visitedMenus.has('writing') && <WritingManagement />}
          </div>
          <div className={currentMenu === 'speaking' ? 'block' : 'hidden'}>
            {visitedMenus.has('speaking') && <SpeakingManagement />}
          </div>
        </div>
      </main>

    </div>
  );
};

export default AdminDashboard;