import React from 'react';

const PageLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="relative flex items-center justify-center">
        {/* Glow effect */}
        <div className="absolute w-24 h-24 bg-blue-600/20 rounded-full blur-xl animate-pulse" />
        {/* Spinner */}
        <div className="w-12 h-12 rounded-2xl border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute font-black text-xs text-blue-400">T</div>
      </div>
      <p className="mt-4 text-xs font-bold tracking-wider text-slate-400 uppercase animate-pulse">
        Đang tải trang...
      </p>
    </div>
  );
};

export default PageLoader;
