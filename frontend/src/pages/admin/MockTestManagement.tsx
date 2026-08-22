import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { mockTestService } from '../../services/mockTestService';

const MockTestManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [mockClassId, setMockClassId] = useState<number | ''>('');
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [selectedMockTestId, setSelectedMockTestId] = useState<number | ''>('');
  const [newMockTest, setNewMockTest] = useState({ title: '', type: 'READING', pdfUrl: '', audioUrl: '' });
  
  const [questionData, setQuestionData] = useState<Record<number, { text: string, answer: string }>>({});

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => setAvailableClasses(Array.isArray(res) ? res : res.data || []));
  }, []);

  useEffect(() => {
    if (mockClassId) {
      mockTestService.getTestsByClass(Number(mockClassId)).then((res: any) => {
        setMockTests(Array.isArray(res) ? res : res.data || []);
        setSelectedMockTestId(''); setQuestionData({});
      });
    }
  }, [mockClassId]);

  useEffect(() => {
    if (selectedMockTestId) {
      mockTestService.getAnswers(Number(selectedMockTestId)).then((res: any) => {
        const qs = Array.isArray(res) ? res : res.data || [];
        const qd: Record<number, { text: string, answer: string }> = {};
        qs.forEach((q: any) => { 
            qd[q.questionNumber || q.question_number] = {
                text: q.questionText || q.question_text || '',
                answer: q.correctAnswer || q.correct_answer || ''
            }; 
        });
        setQuestionData(qd);
      });
    }
  }, [selectedMockTestId]);

  const handleAddMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockClassId) return;
    await mockTestService.createTest(Number(mockClassId), newMockTest);
    setNewMockTest({ title: '', type: 'READING', pdfUrl: '', audioUrl: '' });
    const res: any = await mockTestService.getTestsByClass(Number(mockClassId));
    setMockTests(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteMockTest = async (id: number) => {
    if(!window.confirm('Cảnh báo: Xóa đề thi này sẽ xóa toàn bộ đáp án và bảng điểm. Tiếp tục?')) return;
    await mockTestService.deleteTest(id);
    if(selectedMockTestId === id) { setSelectedMockTestId(''); setQuestionData({}); }
    const res: any = await mockTestService.getTestsByClass(Number(mockClassId));
    setMockTests(Array.isArray(res) ? res : res.data || []);
  };

  const handleSaveAnswerKey = async () => {
    if(!selectedMockTestId) return;
    const questions = Object.keys(questionData).map(num => ({ 
        questionNumber: Number(num), 
        questionText: questionData[Number(num)].text,
        correctAnswer: questionData[Number(num)].answer 
    }));
    try {
      await mockTestService.saveAnswerKey(Number(selectedMockTestId), questions);
      alert("Đã lưu Đáp án và Nội dung câu hỏi thành công!");
    } catch (error) { alert("Lỗi lưu đáp án!"); }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* STEP 1: CLASS SELECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Tải thư viện đề thi thử Reading & Listening của lớp</p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50" 
          value={mockClassId} 
          onChange={(e) => setMockClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {mockClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* STEP 2: TESTS LIST */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📂</span> Danh sách Đề thi
            </h3>

            <form onSubmit={handleAddMockTest} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
               <input required type="text" placeholder="Tên đề thi..." className="w-full p-2.5 text-xs font-semibold border rounded-xl outline-none focus:border-blue-600 bg-white" value={newMockTest.title} onChange={e => setNewMockTest({...newMockTest, title: e.target.value})} />
               
               <select className="w-full p-2.5 text-xs font-bold border rounded-xl outline-none text-slate-800 bg-white" value={newMockTest.type} onChange={e => setNewMockTest({...newMockTest, type: e.target.value})}>
                  <option value="READING">Đề READING (Chỉ cần Link PDF)</option>
                  <option value="LISTENING">Đề LISTENING (Cần Link PDF & Audio)</option>
               </select>

               {/* Luôn cho phép nhập PDF Link */}
               <input required type="text" placeholder="Link PDF Đề Bài (Google Drive/Cloud)..." className="w-full p-2.5 text-xs border rounded-xl outline-none bg-white font-medium" value={newMockTest.pdfUrl} onChange={e => setNewMockTest({...newMockTest, pdfUrl: e.target.value})} />

               {/* Nhập thêm Link Audio nếu chọn Module LISTENING */}
               {newMockTest.type === 'LISTENING' && (
                 <input required type="text" placeholder="Link Audio (.mp3)..." className="w-full p-2.5 text-xs border rounded-xl outline-none bg-white font-medium text-emerald-700" value={newMockTest.audioUrl} onChange={e => setNewMockTest({...newMockTest, audioUrl: e.target.value})} />
               )}

               <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer">
                 + Tạo Đề Thi Mới
               </button>
            </form>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {mockTests.map(test => (
                <div key={test.id} onClick={() => setSelectedMockTestId(test.id)} className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${selectedMockTestId === test.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200/80 hover:bg-slate-50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-slate-800 text-xs line-clamp-2">{test.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMockTest(test.id); }} className="text-rose-500 hover:text-rose-700 text-[10px] font-bold shrink-0 cursor-pointer">Xóa</button>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md w-max ${test.type === 'READING' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {test.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: ANSWER KEY FORM */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm col-span-1 lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
               <div>
                 <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                   <span>🔑</span> Khai báo Bảng Đáp Án (40 Câu)
                 </h3>
                 <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                   💡 Mẹo: Nhập nhiều đáp án đúng cách nhau bởi dấu gạch chéo (VD: <span className="font-mono text-emerald-600 font-bold">A/C/B</span> hoặc <span className="font-mono text-emerald-600 font-bold">centre/center</span>)
                 </p>
               </div>
               {selectedMockTestId && (
                 <button onClick={handleSaveAnswerKey} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer">
                   Lưu Dữ Liệu Đáp Án
                 </button>
               )}
            </div>

            {!selectedMockTestId ? (
              <p className="text-xs text-slate-400 text-center py-20 font-medium">👈 Chọn đề thi ở cột bên trái để cập nhật đáp án</p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 custom-scrollbar">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[...Array(40)].map((_, i) => {
                       const num = i + 1;
                       const data = questionData[num] || { text: '', answer: '' };
                       return (
                         <div key={num} className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 hover:border-blue-300 transition-colors">
                            <div className="flex items-start gap-2">
                               <span className="w-6 h-6 shrink-0 bg-blue-100 text-blue-700 font-extrabold rounded-lg flex items-center justify-center text-[11px] mt-0.5">
                                 {num}
                               </span>
                               <textarea 
                                 rows={2}
                                 placeholder="Nội dung câu hỏi / Gợi ý ngữ cảnh..." 
                                 className="flex-1 p-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-600 resize-none bg-slate-50/50 font-medium" 
                                 value={data.text} 
                                 onChange={e => setQuestionData({...questionData, [num]: { ...data, text: e.target.value }})} 
                               />
                            </div>

                            <div className="pl-8">
                               <input 
                                 type="text" 
                                 placeholder="VD: A hoặc A/C/D hoặc centre/center..." 
                                 className="w-full p-2 text-xs border border-emerald-200 rounded-xl outline-none focus:border-emerald-600 uppercase font-black text-emerald-700 bg-emerald-50/30 placeholder:font-normal placeholder:normal-case" 
                                 value={data.answer} 
                                 onChange={e => setQuestionData({...questionData, [num]: { ...data, answer: e.target.value }})} 
                               />
                            </div>
                         </div>
                       );
                    })}
                 </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default MockTestManagement;