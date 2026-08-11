import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { writingService } from '../../services/writingService';

const WritingManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [writingClassId, setWritingClassId] = useState<number | ''>('');
  
  const [writingTopics, setWritingTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
  const [newTopicName, setNewTopicName] = useState('');

  const [prompts, setPrompts] = useState<any[]>([]);
  const [newPrompt, setNewPrompt] = useState({ vietnameseSentence: '', keywords: '', englishAnswer: '' });

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => setAvailableClasses(Array.isArray(res) ? res : res.data || []));
  }, []);

  // Khi chọn lớp -> Lấy danh sách Topic
  useEffect(() => {
    if (writingClassId) {
      writingService.getTopicsByClass(Number(writingClassId)).then((res: any) => {
        setWritingTopics(Array.isArray(res) ? res : res.data || []);
        setSelectedTopicId('');
        setPrompts([]);
      });
    }
  }, [writingClassId]);

  // Khi chọn Topic -> Lấy danh sách Prompts
  useEffect(() => {
    if (selectedTopicId) {
      writingService.getPromptsByTopic(Number(selectedTopicId)).then((res: any) => {
        setPrompts(Array.isArray(res) ? res : res.data || []);
      });
    }
  }, [selectedTopicId]);

  const handleAddTopic = async () => {
    if (!writingClassId || !newTopicName.trim()) return;
    await writingService.createTopic(Number(writingClassId), newTopicName.trim());
    setNewTopicName('');
    const res: any = await writingService.getTopicsByClass(Number(writingClassId));
    setWritingTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteTopic = async (id: number) => {
    if(!window.confirm('Xóa chủ đề này sẽ xóa toàn bộ bài tập bên trong?')) return;
    await writingService.deleteTopic(id);
    if(selectedTopicId === id) { setSelectedTopicId(''); setPrompts([]); }
    const res: any = await writingService.getTopicsByClass(Number(writingClassId));
    setWritingTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    await writingService.createPrompt(Number(selectedTopicId), newPrompt);
    setNewPrompt({ vietnameseSentence: '', keywords: '', englishAnswer: '' });
    const res: any = await writingService.getPromptsByTopic(Number(selectedTopicId));
    setPrompts(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeletePrompt = async (id: number) => {
    if(!window.confirm('Xóa bài tập này?')) return;
    await writingService.deletePrompt(id);
    const res: any = await writingService.getPromptsByTopic(Number(selectedTopicId));
    setPrompts(Array.isArray(res) ? res : res.data || []);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* BƯỚC 1: CHỌN LỚP */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Chọn lớp học để quản lý danh sách chủ đề bài tập Writing</p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500 bg-slate-50/50" 
          value={writingClassId} 
          onChange={(e) => setWritingClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {writingClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* BƯỚC 2: QUẢN LÝ CHỦ ĐỀ (TOPIC) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📂</span> Chủ đề Writing
            </h3>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Tên chủ đề mới..." 
                className="flex-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-rose-500" 
                value={newTopicName} 
                onChange={(e) => setNewTopicName(e.target.value)} 
              />
              <button 
                onClick={handleAddTopic} 
                className="px-4 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20 active:scale-95"
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {writingTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Chưa có chủ đề nào.</p>
              ) : (
                writingTopics.map(topic => (
                  <div 
                    key={topic.id} 
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      selectedTopicId === topic.id 
                        ? 'border-rose-500 bg-rose-50/50 shadow-sm' 
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-800 text-xs truncate">{topic.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }} 
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-bold px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BƯỚC 3: CÂU HỎI TRONG TOPIC */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            {!selectedTopicId ? (
              <div className="flex flex-col items-center justify-center text-slate-400 font-bold py-24">
                <span className="text-4xl mb-3 opacity-60">👈</span> 
                <p className="text-xs">Vui lòng chọn một Chủ đề ở cột bên trái để thêm/sửa bài tập Writing</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>✍️</span> Danh sách Câu Dịch
                </h3>

                <form onSubmit={handleAddPrompt} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Câu tiếng Việt</label>
                    <textarea required rows={2} className="w-full p-2.5 text-xs border rounded-xl outline-none focus:border-rose-500 resize-none bg-white font-medium" placeholder="Ví dụ: Mặc dù trời mưa, tôi vẫn đi học..." value={newPrompt.vietnameseSentence} onChange={e => setNewPrompt({...newPrompt, vietnameseSentence: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Từ khóa bắt buộc (Keywords cách nhau bằng dấu phẩy)</label>
                    <input required type="text" className="w-full p-2.5 text-xs border rounded-xl outline-none focus:border-rose-500 bg-white font-semibold" placeholder="although, raining, go to school" value={newPrompt.keywords} onChange={e => setNewPrompt({...newPrompt, keywords: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Đáp án tiếng Anh chuẩn</label>
                    <textarea required rows={2} className="w-full p-2.5 text-xs border rounded-xl outline-none focus:border-rose-500 resize-none bg-white font-medium" placeholder="Although it was raining, I still went to school" value={newPrompt.englishAnswer} onChange={e => setNewPrompt({...newPrompt, englishAnswer: e.target.value})} />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button type="submit" className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 active:scale-95">
                      + Thêm Bài Tập Vào Topic
                    </button>
                  </div>
                </form>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                  {prompts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Chưa có câu hỏi nào trong chủ đề này.</p>
                  ) : (
                    prompts.map((p, i) => (
                      <div key={p.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-rose-200 bg-slate-50/50 relative group transition-all space-y-2">
                         <button 
                           onClick={() => handleDeletePrompt(p.id)} 
                           className="absolute top-4 right-4 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1 rounded-lg text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100"
                         >
                           Xóa
                         </button>

                         <div className="flex items-center gap-2 pr-12">
                           <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Câu {i + 1}</span>
                           <span className="font-bold text-slate-800 text-xs">{p.vietnameseSentence || p.vietnamese_sentence}</span>
                         </div>

                         <div className="pl-3 border-l-2 border-rose-300">
                           <p className="text-xs font-mono text-slate-500">🔑 Keywords: {p.keywords}</p>
                         </div>

                         <div className="pl-3 border-l-2 border-emerald-400">
                           <p className="text-xs font-bold text-emerald-700">{p.englishAnswer || p.english_answer}</p>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default WritingManagement;