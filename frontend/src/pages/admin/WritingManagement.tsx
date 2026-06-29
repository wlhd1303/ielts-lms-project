import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { writingService } from '../../services/writingService';

const WritingManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [writingClassId, setWritingClassId] = useState<number | ''>('');
  const [prompts, setPrompts] = useState<any[]>([]);
  
  const [newPrompt, setNewPrompt] = useState({ vietnameseSentence: '', keywords: '', englishAnswer: '' });

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => setAvailableClasses(Array.isArray(res) ? res : res.data || []));
  }, []);

  useEffect(() => {
    if (writingClassId) {
      writingService.getPromptsByClass(Number(writingClassId)).then((res: any) => {
        setPrompts(Array.isArray(res) ? res : res.data || []);
      });
    }
  }, [writingClassId]);

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writingClassId) return;
    await writingService.createPrompt(Number(writingClassId), newPrompt);
    setNewPrompt({ vietnameseSentence: '', keywords: '', englishAnswer: '' });
    const res: any = await writingService.getPromptsByClass(Number(writingClassId));
    setPrompts(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeletePrompt = async (id: number) => {
    if(!window.confirm('Bạn có chắc muốn xóa bài tập này?')) return;
    await writingService.deletePrompt(id);
    const res: any = await writingService.getPromptsByClass(Number(writingClassId));
    setPrompts(Array.isArray(res) ? res : res.data || []);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Bước 1: Chọn lớp học</label>
        <select className="w-full md:w-1/3 p-3 border border-gray-200 text-gray-700 rounded-xl outline-none focus:border-rose-500" value={writingClassId} onChange={(e) => setWritingClassId(Number(e.target.value))}>
          <option value="" disabled>-- Chọn Lớp --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {writingClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM THÊM MỚI */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 h-[600px]">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>➕</span> Thêm Câu Dịch Mới</h3>
            <form onSubmit={handleAddPrompt} className="flex flex-col gap-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 mb-1 block">Câu tiếng Việt</label>
                 <textarea required rows={3} className="w-full p-3 text-sm border rounded-xl outline-none focus:border-rose-500 resize-none bg-gray-50" placeholder="Mặc dù trời mưa, tôi vẫn đi học..." value={newPrompt.vietnameseSentence} onChange={e => setNewPrompt({...newPrompt, vietnameseSentence: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 mb-1 block">Từ khóa bắt buộc (cách nhau dấu phẩy)</label>
                 <input required type="text" className="w-full p-3 text-sm border rounded-xl outline-none focus:border-rose-500 bg-gray-50" placeholder="although, raining, go to school" value={newPrompt.keywords} onChange={e => setNewPrompt({...newPrompt, keywords: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 mb-1 block">Đáp án mẫu (Tiếng Anh)</label>
                 <textarea required rows={3} className="w-full p-3 text-sm border rounded-xl outline-none focus:border-rose-500 resize-none bg-gray-50" placeholder="Although it was raining, I still went to school" value={newPrompt.englishAnswer} onChange={e => setNewPrompt({...newPrompt, englishAnswer: e.target.value})} />
               </div>
               <button type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all">Tạo Bài Tập</button>
            </form>
          </div>

          {/* DANH SÁCH BÀI TẬP */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 h-[600px] flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📚</span> Ngân hàng câu hỏi Writing</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {prompts.length === 0 ? <p className="text-center text-gray-400 mt-10">Chưa có bài tập nào.</p> : prompts.map((p, i) => (
                <div key={p.id} className="p-5 border border-gray-100 rounded-2xl hover:border-rose-200 transition-all bg-gray-50/50 relative group">
                   <button onClick={() => handleDeletePrompt(p.id)} className="absolute top-4 right-4 text-red-400 hover:text-white hover:bg-red-500 px-3 py-1 rounded text-xs font-bold transition-colors opacity-0 group-hover:opacity-100">Xóa</button>
                   <div className="mb-2">
                     <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider mr-2">Câu {i + 1}</span>
                     <span className="font-bold text-gray-800">{p.vietnameseSentence || p.vietnamese_sentence}</span>
                   </div>
                   <div className="mb-2 pl-2 border-l-2 border-rose-300">
                     <p className="text-sm font-mono text-gray-500">🔑 {p.keywords}</p>
                   </div>
                   <div className="pl-2 border-l-2 border-green-300">
                     <p className="text-sm font-medium text-green-700">{p.englishAnswer || p.english_answer}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WritingManagement;