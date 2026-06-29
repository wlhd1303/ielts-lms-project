import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending'); 
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]); 
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassMap, setSelectedClassMap] = useState<Record<number, number>>({});
  const [selectedFeaturesMap, setSelectedFeaturesMap] = useState<Record<number, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const FEATURE_LIST = [
    { key: 'MOCK_TEST', label: 'Mock Test', icon: '📝' },
    { key: 'DICTATION', label: 'Dictation', icon: '🎧' },
    { key: 'VOCAB', label: 'Vocabulary', icon: '📚' },
    { key: 'SPEAKING', label: 'Speaking', icon: '🎙️' },
    { key: 'WRITING', label: 'Writing', icon: '✍️' }
  ];

  const [stats, setStats] = useState([
    { title: "Học viên", value: "0", trend: "Đang học", icon: "👥", color: "bg-blue-500" },
    { title: "Chờ duyệt", value: "0", trend: "Cần xử lý", icon: "⏳", color: "bg-amber-500" },
    { title: "Cần chấm điểm", value: "18", trend: "Writing & Speaking", icon: "⚠️", color: "bg-red-500" }
  ]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, classesRes, activitiesRes]: [any, any, any] = await Promise.all([
        adminService.getAllUsers(), adminService.getAllClasses(), adminService.getRecentActivities() 
      ]);

      const safeUsersData = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      const safeClassesData = Array.isArray(classesRes) ? classesRes : (classesRes?.data || []);

      const pending = safeUsersData.filter((u: any) => u.status === 'PENDING');
      const active = safeUsersData.filter((u: any) => u.status === 'ACTIVE');
      
      setPendingUsers(pending); setActiveUsers(active); setAvailableClasses(safeClassesData);

      const featuresMap: Record<number, string[]> = {};
      active.forEach((u: any) => {
        featuresMap[u.id] = u.permissions?.filter((p:any) => p.active || p.isActive || p.is_active).map((p: any) => p.featureKey || p.feature_key) || [];
      });
      setSelectedFeaturesMap(featuresMap);

      setStats(prev => {
        const newStats = [...prev];
        newStats[0].value = active.length.toString();
        newStats[1].value = pending.length.toString(); 
        return newStats;
      });

      const safeActivitiesData = Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes?.data || []);
      setRecentActivities(safeActivitiesData.map((record: any) => {
        const date = new Date(record.createdAt);
        let actionText = record.moduleType === 'VOCAB' ? `Hoàn thành Từ vựng (${record.score} câu)` :
                         record.moduleType === 'DICTATION' ? `Nộp bài Nghe chép (${Math.round(record.score)}%)` : 
                         record.moduleType === 'MOCK_TEST' ? `Nộp bài Thi thử (${Math.round(record.score)}%)` : `Làm bài ${record.moduleType}`;
        return { id: record.id, student: record.user?.username || 'Học viên', action: actionText, time: date.toLocaleTimeString('vi-VN') + ' ' + date.toLocaleDateString('vi-VN'), status: "Hoàn tất", type: "success" };
      }));
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleClassSelect = (userId: number, classId: string) => setSelectedClassMap(prev => ({...prev, [userId]: Number(classId)}));
  
  const handleFeatureToggle = (userId: number, featureKey: string) => {
    const currentFeatures = selectedFeaturesMap[userId] || [];
    if (currentFeatures.includes(featureKey)) setSelectedFeaturesMap(prev => ({ ...prev, [userId]: currentFeatures.filter(k => k !== featureKey) }));
    else setSelectedFeaturesMap(prev => ({ ...prev, [userId]: [...currentFeatures, featureKey] }));
  };

  const handleApprove = async (userId: number) => {
    const classId = selectedClassMap[userId];
    const features = selectedFeaturesMap[userId] || []; 
    if (!classId) return alert("Vui lòng chọn lớp!");
    try { await adminService.approveStudent(userId, classId, features); alert("Đã duyệt!"); fetchAdminData(); } catch (error) { alert("Lỗi!"); }
  };

  const handleUpdatePermissions = async (userId: number) => {
    try { await adminService.updatePermissions(userId, selectedFeaturesMap[userId] || []); alert("Đã cập nhật!"); fetchAdminData(); } catch (error) { alert("Lỗi!"); }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500 font-medium">Đang tải dữ liệu...</div>;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div><p className="text-sm text-gray-500">{stat.title}</p><h3 className="text-3xl font-black text-gray-800">{stat.value}</h3></div>
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white text-xl`}>{stat.icon}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex border-b border-gray-200 mb-6">
            <button onClick={() => setActiveTab('pending')} className={`py-3 px-6 text-sm font-bold transition-all border-b-2 ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Chờ duyệt</button>
            <button onClick={() => setActiveTab('active')} className={`py-3 px-6 text-sm font-bold transition-all border-b-2 ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Đang học</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-50">
                {(activeTab === 'pending' ? pendingUsers : activeUsers).map(user => (
                  <tr key={user.id} className="border-b border-gray-50">
                    <td className="py-4 font-bold">{user.username} <span className={`text-[10px] px-2 py-0.5 rounded ml-2 ${activeTab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{user.status}</span></td>
                    <td className="py-4">
                      {activeTab === 'pending' && (
                        <select className="border p-1.5 rounded mb-2 text-xs w-full outline-none" value={selectedClassMap[user.id] || ""} onChange={(e) => handleClassSelect(user.id, e.target.value)}>
                          <option value="" disabled>-- Chọn lớp --</option>{availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {FEATURE_LIST.map(f => (
                          <button key={f.key} onClick={() => handleFeatureToggle(user.id, f.key)} className={`px-2 py-1 text-[10px] border rounded font-bold ${(selectedFeaturesMap[user.id] || []).includes(f.key) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-400 border-gray-200'}`}>{f.label}</button>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      {activeTab === 'pending' ? <button onClick={() => handleApprove(user.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Duyệt</button> : <button onClick={() => handleUpdatePermissions(user.id)} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-bold">Cập nhật</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Hoạt động gần đây</h2>
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="text-sm border-l-2 border-blue-500 pl-3">
                <p className="font-semibold text-gray-800">{activity.student}</p>
                <p className="text-gray-600">{activity.action}</p>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserManagement;