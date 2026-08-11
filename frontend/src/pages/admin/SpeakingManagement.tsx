import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const SpeakingManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [speakingClassId, setSpeakingClassId] = useState<number | ''>('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [newLesson, setNewLesson] = useState({ title: '', content: '' });

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => 
      setAvailableClasses(Array.isArray(res) ? res : res.data || [])
    );
  }, []);

  useEffect(() => {
    if (speakingClassId) {
      fetchLessons();
    }
  }, [speakingClassId]);

  const fetchLessons = async () => {
    if (!speakingClassId) return;
    try {
      const res: any = await (adminService as any).getSpeakingLessonsByClass(Number(speakingClassId));
      setLessons(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error("Lỗi lấy bài Speaking:", error);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakingClassId || !newLesson.title.trim() || !newLesson.content.trim()) return;

    try {
      await (adminService as any).createSpeakingLesson(Number(speakingClassId), newLesson);
      setNewLesson({ title: '', content: '' });
      fetchLessons();
    } catch (error) {
      alert("Lỗi khi thêm bài luyện nói!");
    }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài luyện nói này?')) return;
    try {
      await (adminService as any).deleteSpeakingLesson(id);
      fetchLessons();
    } catch (error) {
      alert("Lỗi khi xóa!");
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* BƯỚC 1: CHỌN LỚP */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Chọn lớp học để quản lý bài tập Speaking / Shadowing IPA</p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 bg-slate-50/50" 
          value={speakingClassId} 
          onChange={(e) => setSpeakingClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {speakingClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* FORM THÊM BÀI HỌC MỚI */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>🎙️</span> Thêm Bài Luyện Nói Mới
            </h3>

            <form onSubmit={handleAddLesson} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Tiêu đề bài học</label>
                <input 
                  required 
                  type="text" 
                  placeholder="VD: Lesson 1 - Describing People..." 
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white" 
                  value={newLesson.title} 
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} 
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Nội dung đoạn văn mẫu (Tiếng Anh)</label>
                <textarea 
                  required 
                  rows={5} 
                  placeholder="Gõ đoạn văn mẫu chuẩn tiếng Anh để học viên thu âm đọc theo (Shadowing)..." 
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-amber-500 resize-none bg-white font-medium" 
                  value={newLesson.content} 
                  onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })} 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
              >
                + Tạo Bài Speaking Mới
              </button>
            </form>
          </div>

          {/* DANH SÁCH BÀI HỌC */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📚</span> Danh Sách Bài Luyện Speaking ({lessons.length})
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {lessons.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">Chưa có bài tập Speaking nào trong lớp này.</p>
              ) : (
                lessons.map((lesson, i) => (
                  <div key={lesson.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-amber-300 bg-slate-50/50 relative group transition-all space-y-2">
                    <button 
                      onClick={() => handleDeleteLesson(lesson.id)} 
                      className="absolute top-4 right-4 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1 rounded-lg text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100"
                    >
                      Xóa
                    </button>

                    <div className="flex items-center gap-2 pr-12">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Bài {i + 1}</span>
                      <span className="font-bold text-slate-800 text-xs md:text-sm">{lesson.title}</span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                      "{lesson.content}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default SpeakingManagement;