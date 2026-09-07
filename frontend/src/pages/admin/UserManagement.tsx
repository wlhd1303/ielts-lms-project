import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { streakService } from '../../services/streakService';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'classes' | 'streak'>('pending'); 
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]); 
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassMap, setSelectedClassMap] = useState<Record<number, number>>({});
  const [selectedFeaturesMap, setSelectedFeaturesMap] = useState<Record<number, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [streakStudents, setStreakStudents] = useState<any[]>([]);

  // State cho Form Tạo Lớp
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // ⚡ Danh sách Feature Key đầy đủ 6 kỹ năng
  const FEATURE_LIST = [
    { key: 'MOCK_TEST', label: 'Mock Test', icon: '📝' },
    { key: 'DICTATION', label: 'Dictation', icon: '🎧' },
    { key: 'VOCAB', label: 'Vocabulary', icon: '📚' },
    { key: 'LISTENING_VOCAB', label: 'Listening Vocab', icon: '⚡' },
    { key: 'SPEAKING', label: 'Speaking', icon: '🎙️' },
    { key: 'WRITING', label: 'Writing', icon: '✍️' }
  ];

  const [stats, setStats] = useState([
    { title: "Học viên hoạt động", value: "0", sub: "Tài khoản đang học", icon: "👥", color: "from-blue-500 to-indigo-600" },
    { title: "Yêu cầu duyệt", value: "0", sub: "Cần xếp lớp ngay", icon: "⏳", color: "from-amber-500 to-orange-600" },
    { title: "Tổng số Lớp học", value: "0", sub: "Lớp đang vận hành", icon: "🏫", color: "from-indigo-600 to-purple-600" }
  ]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, classesRes, activitiesRes, streakRes]: [any, any, any, any] = await Promise.all([
        adminService.getAllUsers(), 
        adminService.getAllClasses(), 
        adminService.getRecentActivities(),
        streakService.getAdminDashboard().catch(() => [])
      ]);

      const safeUsersData = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      const safeClassesData = Array.isArray(classesRes) ? classesRes : (classesRes?.data || []);

      const pending = safeUsersData.filter((u: any) => u.status === 'PENDING');
      const active = safeUsersData.filter((u: any) => u.status === 'ACTIVE');
      
      setPendingUsers(pending); 
      setActiveUsers(active); 
      setAvailableClasses(safeClassesData);

      const currentClassMap: Record<number, number> = {};
      const featuresMap: Record<number, string[]> = {};
      
      safeUsersData.forEach((u: any) => {
        if (u.studentClass?.id) currentClassMap[u.id] = u.studentClass.id;
        featuresMap[u.id] = u.permissions
          ?.filter((p: any) => p.active || p.isActive || p.is_active)
          .map((p: any) => p.featureKey || p.feature_key) || ['MOCK_TEST', 'DICTATION', 'VOCAB', 'LISTENING_VOCAB', 'SPEAKING', 'WRITING'];
      });
      setSelectedClassMap(currentClassMap);
      setSelectedFeaturesMap(featuresMap);

      setStats([
        { title: "Học viên hoạt động", value: active.length.toString(), sub: "Đang truy cập LMS", icon: "👥", color: "from-blue-500 to-indigo-600" },
        { title: "Yêu cầu duyệt", value: pending.length.toString(), sub: pending.length > 0 ? "Cần xếp lớp gấp" : "Đã xử lý hết", icon: "⏳", color: "from-amber-500 to-orange-600" },
        { title: "Tổng số Lớp học", value: safeClassesData.length.toString(), sub: "Đang hoạt động", icon: "🏫", color: "from-indigo-600 to-purple-600" }
      ]);

      const safeStreakData = Array.isArray(streakRes) ? streakRes : (streakRes?.data || []);
      setStreakStudents(safeStreakData);

      const safeActivitiesData = Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes?.data || []);
      setRecentActivities(safeActivitiesData.map((record: any) => {
        const date = new Date(record.createdAt || Date.now());
        let actionText = record.moduleType === 'VOCAB' ? `Hoàn thành Bài Từ vựng` :
                         record.moduleType === 'READING_VOCAB_TEST' ? `Hoàn thành Mini Test Từ vựng Reading` :
                         record.moduleType === 'LISTENING_VOCAB_TEST' ? `Hoàn thành Phản xạ Listening Vocab` :
                         record.moduleType === 'DICTATION' ? `Nộp bài Nghe chép chính tả` : 
                         record.moduleType === 'MOCK_TEST' ? `Hoàn thành bài Thi thử` : `Làm bài ${record.moduleType}`;
        return { 
          id: record.id || Math.random(), 
          student: record.user?.username || 'Học viên', 
          action: actionText, 
          score: record.score != null ? `${Math.round(record.score)}%` : null,
          time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('vi-VN'), 
        };
      }));
    } catch (error) { 
      console.error("Lỗi tải dữ liệu Admin:", error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { 
    fetchAdminData(); 
  }, []);

  const handleClassSelect = (userId: number, classId: string) => setSelectedClassMap(prev => ({...prev, [userId]: Number(classId)}));
  
  const handleFeatureToggle = (userId: number, featureKey: string) => {
    const currentFeatures = selectedFeaturesMap[userId] || [];
    if (currentFeatures.includes(featureKey)) setSelectedFeaturesMap(prev => ({ ...prev, [userId]: currentFeatures.filter(k => k !== featureKey) }));
    else setSelectedFeaturesMap(prev => ({ ...prev, [userId]: [...currentFeatures, featureKey] }));
  };

  const handleSelectAllFeatures = (userId: number) => {
    setSelectedFeaturesMap(prev => ({ ...prev, [userId]: FEATURE_LIST.map(f => f.key) }));
  };

  const handleClearAllFeatures = (userId: number) => {
    setSelectedFeaturesMap(prev => ({ ...prev, [userId]: [] }));
  };

  const handleApprove = async (userId: number) => {
    const classId = selectedClassMap[userId];
    const features = selectedFeaturesMap[userId] || []; 
    if (!classId) return alert("Vui lòng chọn lớp cho học viên!");
    try { 
      await adminService.approveStudent(userId, classId, features); 
      alert("Đã duyệt và phân lớp thành công!"); 
      fetchAdminData(); 
    } catch (error) { alert("Lỗi khi duyệt tài khoản!"); }
  };

  const handleUpdateStudent = async (userId: number) => {
    try {
      const classId = selectedClassMap[userId];
      if (classId && (adminService as any).updateStudentClass) {
        await (adminService as any).updateStudentClass(userId, classId);
      }
      await adminService.updatePermissions(userId, selectedFeaturesMap[userId] || []);
      alert("Cập nhật lớp & quyền học viên thành công!");
      fetchAdminData();
    } catch (error) {
      alert("Lỗi cập nhật!");
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return alert("Vui lòng nhập tên lớp học!");
    setIsCreatingClass(true);
    try {
      if ((adminService as any).createClass) {
        await (adminService as any).createClass(newClassName.trim());
        alert("Đã tạo lớp mới thành công!");
        setNewClassName('');
        fetchAdminData();
      }
    } catch (err) {
      alert("Lỗi tạo lớp!");
    } finally {
      setIsCreatingClass(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm">Đang tải dữ liệu học viên & lớp học...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              <span className="text-xs font-semibold text-slate-500 mt-1 inline-block">{stat.sub}</span>
            </div>
            <div className={`w-14 h-14 bg-gradient-to-tr ${stat.color} rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg ring-4 ring-slate-50`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 shrink-0">
              <button 
                onClick={() => setActiveTab('pending')} 
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chờ duyệt
                {pendingUsers.length > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {pendingUsers.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('active')} 
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang học ({activeUsers.length})
              </button>

              <button 
                onClick={() => setActiveTab('classes')} 
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'classes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏫 Lớp học ({availableClasses.length})
              </button>

              <button 
                onClick={() => setActiveTab('streak')} 
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'streak' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🔥</span> Streak
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[600px]">
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <form onSubmit={handleCreateClass} className="flex gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <input 
                    type="text" 
                    placeholder="Nhập tên lớp học mới..." 
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 bg-white"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isCreatingClass}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0 cursor-pointer"
                  >
                    + Tạo Lớp Mới
                  </button>
                </form>

                <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-50 px-5 py-3 font-extrabold text-[11px] text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>Tên Lớp Học</span>
                    <span>Sĩ số hiện tại</span>
                  </div>
                  {availableClasses.map((cls) => {
                    const studentCount = activeUsers.filter(u => u.studentClass?.id === cls.id).length;
                    return (
                      <div key={cls.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                        <span className="font-bold text-slate-800 text-sm">{cls.name}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full border border-indigo-200/60">
                          {studentCount} Học viên
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'streak' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[11px] font-black border-b border-slate-100 uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">Học viên</th>
                      <th className="p-3.5">Lớp</th>
                      <th className="p-3.5 text-center">Tiến trình</th>
                      <th className="p-3.5 text-center">Chuỗi Streak</th>
                      <th className="p-3.5 text-right rounded-r-xl">Trạng thái hôm nay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {streakStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 font-semibold text-xs">Chưa có dữ liệu theo dõi Streak.</td>
                      </tr>
                    ) : (
                      streakStudents.map((student: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors text-xs">
                          <td className="py-4 px-3.5 font-bold text-slate-800">{student.username}</td>
                          <td className="py-4 px-3.5 font-semibold text-slate-500">{student.className}</td>
                          <td className="py-4 px-3.5 text-center">
                            <span className="font-mono font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200/60">
                              Ngày {student.currentDayIndex} / 80
                            </span>
                          </td>
                          <td className="py-4 px-3.5 text-center font-black text-amber-600">
                            🔥 {student.currentStreak} ngày
                          </td>
                          <td className="py-4 px-3.5 text-right">
                            <span className={`px-3 py-1 text-[11px] font-black rounded-full inline-block ${
                              student.completedToday ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-600 border border-rose-200/60 animate-pulse'
                            }`}>
                              {student.completedToday ? '✓ Đã hoàn thành' : '⏳ Chưa làm bài'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(activeTab === 'pending' || activeTab === 'active') && (
              <div className="space-y-4">
                {(activeTab === 'pending' ? pendingUsers : activeUsers).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">Danh sách trống.</div>
                ) : (
                  (activeTab === 'pending' ? pendingUsers : activeUsers).map(user => (
                    <div key={user.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-200 bg-white transition-all space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black flex items-center justify-center text-sm uppercase">
                            {user.username.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {user.fullName ? `${user.fullName} (@${user.username})` : user.username}
                            </p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              user.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              ● {user.status}
                            </span>
                          </div>
                        </div>

                        {activeTab === 'pending' ? (
                          <button 
                            onClick={() => handleApprove(user.id)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                          >
                            Duyệt Lớp
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateStudent(user.id)} 
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Lưu Cập Nhật
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Lớp học</label>
                          <select 
                            className="w-full border border-slate-300 rounded-xl p-2 text-xs font-semibold outline-none focus:border-blue-600 bg-slate-50/50" 
                            value={selectedClassMap[user.id] || ""} 
                            onChange={(e) => handleClassSelect(user.id, e.target.value)}
                          >
                            <option value="" disabled>-- Chọn lớp học --</option>
                            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Quyền truy cập tính năng</label>
                            <div className="flex gap-2 text-[10px] font-bold">
                              <button type="button" onClick={() => handleSelectAllFeatures(user.id)} className="text-blue-600 hover:underline cursor-pointer">Cấp tất cả</button>
                              <span className="text-slate-300">•</span>
                              <button type="button" onClick={() => handleClearAllFeatures(user.id)} className="text-rose-500 hover:underline cursor-pointer">Bỏ tất cả</button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {FEATURE_LIST.map(f => {
                              const isChecked = (selectedFeaturesMap[user.id] || []).includes(f.key);
                              return (
                                <button 
                                  key={f.key} 
                                  type="button"
                                  onClick={() => handleFeatureToggle(user.id, f.key)} 
                                  className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-all cursor-pointer ${
                                    isChecked 
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {f.icon} {f.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-800">Hoạt động gần đây</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real-time</span>
          </div>

          <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-4 text-center">Chưa có nhật ký hoạt động.</p>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{act.student}</span>
                    {act.score && (
                      <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                        {act.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{act.action}</p>
                  <span className="text-[10px] font-semibold text-slate-400 block pt-1">{act.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserManagement;