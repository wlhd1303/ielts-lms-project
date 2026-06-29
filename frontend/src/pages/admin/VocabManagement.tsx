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
    if(!window.confirm('Cảnh báo: Xóa chủ đề này sẽ xóa TOÀN BỘ từ vựng. Tiếp tục?')) return;
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
    <>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Bước 1: Chọn lớp học để quản lý từ vựng</label>
        <select className="w-full md:w-1/2 p-3 border border-gray-200 text-gray-700 rounded-xl outline-none focus:border-blue-500" value={vocabClassId} onChange={(e) => setVocabClassId(Number(e.target.value))}>
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {vocabClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📂</span> Danh sách Chủ đề</h3>
            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Nhập tên chủ đề mới..." className="flex-1 p-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
              <button onClick={handleAddTopic} className="px-4 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">+</button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {vocabTopics.map(topic => (
                <div key={topic.id} className={`p-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${selectedTopicId === topic.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`} onClick={() => setSelectedTopicId(topic.id)}>
                  <span className="font-semibold text-gray-700 text-sm truncate">{topic.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }} className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0 ml-2">Xóa</button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            {!selectedTopicId ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 font-medium py-20"><span className="text-4xl mb-3">👈</span> Hãy chọn một Chủ đề ở cột bên trái</div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📚</span> Từ vựng trong chủ đề</h3>
                <form onSubmit={handleAddWord} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                  <input required type="text" placeholder="Từ Tiếng Anh" className="p-2.5 text-sm border rounded-lg outline-none font-bold text-blue-700 focus:border-blue-500" value={newWord.englishWord} onChange={e => setNewWord({...newWord, englishWord: e.target.value})} />
                  <input required type="text" placeholder="Nghĩa ĐÚNG" className="p-2.5 text-sm border rounded-lg outline-none font-bold text-green-700 focus:border-green-500" value={newWord.vietnameseMeaning} onChange={e => setNewWord({...newWord, vietnameseMeaning: e.target.value})} />
                  <input required type="text" placeholder="Nghĩa sai 1" className="p-2.5 text-sm border rounded-lg outline-none text-gray-600 focus:border-red-400" value={newWord.wrongOption1} onChange={e => setNewWord({...newWord, wrongOption1: e.target.value})} />
                  <input required type="text" placeholder="Nghĩa sai 2" className="p-2.5 text-sm border rounded-lg outline-none text-gray-600 focus:border-red-400" value={newWord.wrongOption2} onChange={e => setNewWord({...newWord, wrongOption2: e.target.value})} />
                  <input required type="text" placeholder="Nghĩa sai 3" className="p-2.5 text-sm border rounded-lg outline-none text-gray-600 focus:border-red-400" value={newWord.wrongOption3} onChange={e => setNewWord({...newWord, wrongOption3: e.target.value})} />
                  <div className="lg:col-span-5 flex justify-end mt-2"><button type="submit" className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 text-sm">Thêm vào bộ từ</button></div>
                </form>
                <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                        <th className="p-4 font-bold border-b border-gray-100">Tiếng Anh</th>
                        <th className="p-4 font-bold border-b border-gray-100 text-green-600">Nghĩa đúng</th>
                        <th className="p-4 font-bold border-b border-gray-100 text-red-400">Các đáp án gây nhiễu</th>
                        <th className="p-4 font-bold border-b border-gray-100 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vocabWords.map(word => (
                        <tr key={word.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 font-black text-blue-600 text-base">{word.englishWord}</td>
                          <td className="p-4 font-bold text-gray-700 bg-green-50/30">{word.vietnameseMeaning}</td>
                          <td className="p-4 text-xs text-gray-500"><span className="block">• {word.wrongOption1}</span><span className="block">• {word.wrongOption2}</span><span className="block">• {word.wrongOption3}</span></td>
                          <td className="p-4 text-right"><button onClick={() => handleDeleteWord(word.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold">Xóa</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VocabManagement;