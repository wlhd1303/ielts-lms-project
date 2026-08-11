import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vocabService } from '../../services/vocabService';
import { authService } from '../../services/authService';
import { adminService } from '../../services/adminService';

const ListeningVocabList = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<any[]>([]);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopicsAndHistory = async () => {
      try {
        const profileRes: any = await authService.getProfile();
        const userData = profileRes?.data?.data || profileRes?.data || profileRes;
        const classId = userData?.studentClass?.id;

        if (classId) {
          // ⚡ Lấy lịch sử nộp bài Listening Vocab của học viên
          const recordsRes: any = await adminService.getRecentActivities();
          const records = Array.isArray(recordsRes) ? recordsRes : (recordsRes?.data || []);
          const doneSet = new Set<number>(
            records
              .filter((r: any) => r.moduleType === 'LISTENING_VOCAB_TEST' && r.user?.id === userData.id)
              .map((r: any) => r.refId)
          );
          setCompletedTopicIds(doneSet);

          const res: any = await vocabService.getTopicsByClass(classId);
          setTopics(Array.isArray(res) ? res : res.data || []);
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách chủ đề Listening Vocab:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopicsAndHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 inline-block transition-colors"
            >
              ← Quay lại Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              ⚡ Listening Vocab - Luyện Phản Xạ Nghe
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Nghe âm thanh phát âm tự động và chọn đáp án nghĩa tiếng Việt chính xác trong 5 giây.
            </p>
          </div>
        </header>

        {/* Danh sách chủ đề */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-slate-400 font-bold text-sm bg-white rounded-3xl border border-slate-200/80">
              Lớp học của bạn chưa có chủ đề từ vựng nào.
            </div>
          ) : (
            topics.map((topic) => {
              const isDone = completedTopicIds.has(topic.id);
              return (
                <div 
                  key={topic.id} 
                  className={`p-6 bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 ${
                    isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{topic.name}</h3>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md inline-block border border-amber-200/60">
                        ⚡ Thử thách 5s/câu
                      </span>

                      {/* ⚡ BADGE ĐÃ HOÀN THÀNH */}
                      {isDone && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                          ✓ DONE
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/listening-vocab/${topic.id}`)}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
                  >
                    {isDone ? 'Nghe Lại ➔' : 'Bắt đầu Nghe ➔'}
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default ListeningVocabList;