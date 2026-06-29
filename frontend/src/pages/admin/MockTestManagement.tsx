import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { mockTestService } from '../../services/mockTestService';

const MockTestManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [mockClassId, setMockClassId] = useState<number | ''>('');
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [selectedMockTestId, setSelectedMockTestId] = useState<number | ''>('');
  const [newMockTest, setNewMockTest] = useState({ title: '', type: 'READING', pdfUrl: '', audioUrl: '' });
  
  // STATE MỚI LƯU CẢ CÂU HỎI LẪN ĐÁP ÁN
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
    if(!window.confirm('Cảnh báo: Xóa đề thi này sẽ xóa luôn bảng điểm và đáp án. Tiếp tục?')) return;
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
      alert("Đã lưu Đáp án và Câu hỏi thành công!");
    } catch (error) { alert("Lỗi khi lưu đáp án!"); }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Bước 1: Chọn lớp học</label>
        <select className="w-full md:w-1/3 p-3 border border-gray-200 text-gray-700 rounded-xl outline-none focus:border-blue-500" value={mockClassId} onChange={(e) => setMockClassId(Number(e.target.value))}>
          <option value="" disabled>-- Chọn Lớp --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {mockClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 h-[600px] flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📂</span> 1. Danh sách Đề</h3>
            <form onSubmit={handleAddMockTest} className="bg-slate-50 p-4 rounded-xl border border-gray-100 mb-4 flex flex-col gap-3 shrink-0">
               <input required type="text" placeholder="Tên đề thi..." className="w-full p-2 text-sm border rounded-lg outline-none" value={newMockTest.title} onChange={e => setNewMockTest({...newMockTest, title: e.target.value})} />
               <select className="w-full p-2 text-sm border rounded-lg outline-none font-bold text-gray-700" value={newMockTest.type} onChange={e => setNewMockTest({...newMockTest, type: e.target.value})}>
                  <option value="READING">Đề READING (Cần PDF)</option>
                  <option value="LISTENING">Đề LISTENING (Cần Audio)</option>
               </select>
               {newMockTest.type === 'READING' ? (
                 <input required type="text" placeholder="Link PDF (Google Drive/Cloud)..." className="w-full p-2 text-sm border rounded-lg outline-none" value={newMockTest.pdfUrl} onChange={e => setNewMockTest({...newMockTest, pdfUrl: e.target.value})} />
               ) : (
                 <input required type="text" placeholder="Link Audio (.mp3)..." className="w-full p-2 text-sm border rounded-lg outline-none" value={newMockTest.audioUrl} onChange={e => setNewMockTest({...newMockTest, audioUrl: e.target.value})} />
               )}
               <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Tạo đề thi</button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {mockTests.map(test => (
                <div key={test.id} className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col transition-all ${selectedMockTestId === test.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`} onClick={() => setSelectedMockTestId(test.id)}>
                  <div className="flex justify-between items-start mb-1"><span className="font-bold text-gray-800 text-sm line-clamp-2 pr-2">{test.title}</span><button onClick={(e) => { e.stopPropagation(); handleDeleteMockTest(test.id); }} className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0">Xóa</button></div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max ${test.type === 'READING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{test.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GIAO DIỆN NHẬP KÉP CHO CÂU HỎI VÀ ĐÁP ÁN */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-base font-bold text-gray-800 flex items-center gap-2"><span>🔑</span> 2. Khai báo Đáp Án (Answer Key)</h3>
               {selectedMockTestId && <button onClick={handleSaveAnswerKey} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg text-sm hover:bg-gray-800 shadow-sm">Lưu Dữ liệu</button>}
            </div>
            {!selectedMockTestId ? ( <p className="text-sm text-gray-400 text-center mt-20">Chọn đề thi ở cột bên trái</p> ) : (
              <div className="flex-1 overflow-y-auto bg-slate-50 border border-gray-100 rounded-xl p-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(40)].map((_, i) => {
                       const num = i + 1;
                       const data = questionData[num] || { text: '', answer: '' };
                       return (
                         <div key={num} className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex items-start gap-2">
                               <span className="w-7 h-7 shrink-0 bg-blue-100 text-blue-600 font-bold rounded flex items-center justify-center text-xs">{num}</span>
                               <textarea 
                                 rows={2}
                                 placeholder="Nội dung câu hỏi/Gợi ý..." 
                                 className="flex-1 p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none bg-gray-50" 
                                 value={data.text} 
                                 onChange={e => setQuestionData({...questionData, [num]: { ...data, text: e.target.value }})} 
                               />
                            </div>
                            <div className="pl-9">
                               <input 
                                 type="text" 
                                 placeholder="Đáp án đúng..." 
                                 className="w-full p-2 text-sm border border-green-200 rounded-lg outline-none focus:border-green-500 uppercase font-bold text-green-700 placeholder:font-normal" 
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
    </>
  );
};

export default MockTestManagement;