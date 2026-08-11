import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const VocabManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [vocabClassId, setVocabClassId] = useState<number | ''>('');
  const [vocabTopics, setVocabTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
  const [vocabWords, setVocabWords] = useState<any[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [newWord, setNewWord] = useState({ englishWord: '', vietnameseMeaning: '', wrongOption1: '', wrongOption2: '', wrongOption3: '' });

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => setAvailableClasses(Array.isArray(res) ? res : res.data || []));
  }, []);

  useEffect(() => {
    if (vocabClassId) {
      adminService.getTopicsByClass(Number(vocabClassId)).then((res: any) => {
        setVocabTopics(Array.isArray(res) ? res : res.data || []);
        setSelectedTopicId(''); setVocabWords([]);
      });
    }
  }, [vocabClassId]);

  useEffect(() => {
    if (selectedTopicId) {
      adminService.getWordsByTopic(Number(selectedTopicId)).then((res: any) => setVocabWords(Array.isArray(res) ? res : res.data || []));
    }
  }, [selectedTopicId]);

  const handleAddTopic = async () => {
    if (!vocabClassId || !newTopicName) return;
    await adminService.createTopic(Number(vocabClassId), newTopicName);
    setNewTopicName('');
    const res: any = await adminService.getTopicsByClass(Number(vocabClassId));
    setVocabTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteTopic = async (id: number) => {
    if(!window.confirm('Cảnh báo: Xóa chủ đề này sẽ xóa TOÀN BỘ từ vựng liên quan. Tiếp tục?')) return;
    await adminService.deleteTopic(id);
    if(selectedTopicId === id) { setSelectedTopicId(''); setVocabWords([]); }
    const res: any = await adminService.getTopicsByClass(Number(vocabClassId));
    setVocabTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    await adminService.createWord(Number(selectedTopicId), newWord);
    setNewWord({ englishWord: '', vietnameseMeaning: '', wrongOption1: '', wrongOption2: '', wrongOption3: '' });
    const res: any = await adminService.getWordsByTopic(Number(selectedTopicId));
    setVocabWords(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteWord = async (id: number) => {
    if(!window.confirm('Xóa từ vựng này?')) return;
    await adminService.deleteWord(id);
    const res: any = await adminService.getWordsByTopic(Number(selectedTopicId));
    setVocabWords(Array.isArray(res) ? res : res.data || []);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* STEP 1: CLASS SELECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Chọn lớp học để tải danh sách chủ đề và kho từ vựng tương ứng</p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50" 
          value={vocabClassId} 
          onChange={(e) => setVocabClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {vocabClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* STEP 2: TOPICS LIST */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📂</span> Chủ đề Từ vựng
            </h3>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nhập tên chủ đề mới..." 
                className="flex-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-600" 
                value={newTopicName} 
                onChange={(e) => setNewTopicName(e.target.value)} 
              />
              <button 
                onClick={handleAddTopic} 
                className="px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {vocabTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Chưa có chủ đề nào.</p>
              ) : (
                vocabTopics.map(topic => (
                  <div 
                    key={topic.id} 
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      selectedTopicId === topic.id 
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
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

          {/* STEP 3: WORDS DATA */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            {!selectedTopicId ? (
              <div className="flex flex-col items-center justify-center text-slate-400 font-bold py-24">
                <span className="text-4xl mb-3 opacity-60">👈</span> 
                <p className="text-xs">Vui lòng chọn một Chủ đề ở cột bên trái để quản lý từ vựng</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>📚</span> Danh sách Từ vựng
                </h3>

                <form onSubmit={handleAddWord} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required type="text" placeholder="Từ Tiếng Anh (English)" className="p-2.5 text-xs font-bold border rounded-xl outline-none text-blue-700 focus:border-blue-600 bg-white" value={newWord.englishWord} onChange={e => setNewWord({...newWord, englishWord: e.target.value})} />
                    <input required type="text" placeholder="Nghĩa ĐÚNG (Tiếng Việt)" className="p-2.5 text-xs font-bold border rounded-xl outline-none text-emerald-700 focus:border-emerald-600 bg-white" value={newWord.vietnameseMeaning} onChange={e => setNewWord({...newWord, vietnameseMeaning: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input required type="text" placeholder="Nghĩa gây nhiễu 1" className="p-2.5 text-xs border rounded-xl outline-none text-slate-600 focus:border-rose-400 bg-white" value={newWord.wrongOption1} onChange={e => setNewWord({...newWord, wrongOption1: e.target.value})} />
                    <input required type="text" placeholder="Nghĩa gây nhiễu 2" className="p-2.5 text-xs border rounded-xl outline-none text-slate-600 focus:border-rose-400 bg-white" value={newWord.wrongOption2} onChange={e => setNewWord({...newWord, wrongOption2: e.target.value})} />
                    <input required type="text" placeholder="Nghĩa gây nhiễu 3" className="p-2.5 text-xs border rounded-xl outline-none text-slate-600 focus:border-rose-400 bg-white" value={newWord.wrongOption3} onChange={e => setNewWord({...newWord, wrongOption3: e.target.value})} />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button type="submit" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95">
                      + Thêm Từ Vựng
                    </button>
                  </div>
                </form>

                <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                        <th className="p-3.5">Tiếng Anh</th>
                        <th className="p-3.5 text-emerald-700">Nghĩa chuẩn</th>
                        <th className="p-3.5 text-slate-400">Đáp án nhiễu</th>
                        <th className="p-3.5 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {vocabWords.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-400 font-semibold">Chủ đề này chưa có từ vựng.</td>
                        </tr>
                      ) : (
                        vocabWords.map(word => (
                          <tr key={word.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-black text-blue-600 text-sm">{word.englishWord}</td>
                            <td className="p-3.5 font-bold text-slate-800 bg-emerald-50/30">{word.vietnameseMeaning}</td>
                            <td className="p-3.5 text-[11px] text-slate-500 leading-snug">
                              <span className="block">• {word.wrongOption1}</span>
                              <span className="block">• {word.wrongOption2}</span>
                              <span className="block">• {word.wrongOption3}</span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button onClick={() => handleDeleteWord(word.id)} className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg font-bold text-[11px] transition-all">
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default VocabManagement;