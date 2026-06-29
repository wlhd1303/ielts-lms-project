import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const DictationManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [dicClassId, setDicClassId] = useState<number | ''>('');
  const [dicTopics, setDicTopics] = useState<any[]>([]);
  const [selectedDicTopicId, setSelectedDicTopicId] = useState<number | ''>('');
  const [dicAudios, setDicAudios] = useState<any[]>([]);
  const [selectedDicAudioId, setSelectedDicAudioId] = useState<number | ''>('');
  const [dicQuestions, setDicQuestions] = useState<any[]>([]);

  const [newDicTopicName, setNewDicTopicName] = useState('');
  const [newDicAudioUrl, setNewDicAudioUrl] = useState('');
  const [newDicQuestion, setNewDicQuestion] = useState({ startTime: '', endTime: '', transcript: '' });

  useEffect(() => {
    adminService.getAllClasses().then((res: any) => setAvailableClasses(Array.isArray(res) ? res : res.data || []));
  }, []);

  useEffect(() => {
    if (dicClassId) {
      adminService.getDictationTopicsByClass(Number(dicClassId)).then((res: any) => {
        setDicTopics(Array.isArray(res) ? res : res.data || []);
        setSelectedDicTopicId(''); setDicAudios([]); setSelectedDicAudioId(''); setDicQuestions([]);
      });
    }
  }, [dicClassId]);

  useEffect(() => {
    if (selectedDicTopicId) {
      adminService.getDictationAudiosByTopic(Number(selectedDicTopicId)).then((res: any) => {
        setDicAudios(Array.isArray(res) ? res : res.data || []);
        setSelectedDicAudioId(''); setDicQuestions([]);
      });
    }
  }, [selectedDicTopicId]);

  useEffect(() => {
    if (selectedDicAudioId) {
      adminService.getDictationQuestionsByAudio(Number(selectedDicAudioId)).then((res: any) => setDicQuestions(Array.isArray(res) ? res : res.data || []));
    }
  }, [selectedDicAudioId]);

  const handleAddDicTopic = async () => {
    if (!dicClassId || !newDicTopicName) return;
    await adminService.createDictationTopic(Number(dicClassId), newDicTopicName);
    setNewDicTopicName('');
    const res: any = await adminService.getDictationTopicsByClass(Number(dicClassId));
    setDicTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteDicTopic = async (id: number) => {
    if(!window.confirm('Xóa chủ đề và toàn bộ dữ liệu nghe?')) return;
    await adminService.deleteDictationTopic(id);
    if(selectedDicTopicId === id) { setSelectedDicTopicId(''); setDicAudios([]); setSelectedDicAudioId(''); setDicQuestions([]); }
    const res: any = await adminService.getDictationTopicsByClass(Number(dicClassId));
    setDicTopics(Array.isArray(res) ? res : res.data || []);
  };

  const handleAddDicAudio = async () => {
    if (!selectedDicTopicId || !newDicAudioUrl) return;
    await adminService.createDictationAudio(Number(selectedDicTopicId), newDicAudioUrl);
    setNewDicAudioUrl('');
    const res: any = await adminService.getDictationAudiosByTopic(Number(selectedDicTopicId));
    setDicAudios(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteDicAudio = async (id: number) => {
    if(!window.confirm('Xóa link Audio này?')) return;
    await adminService.deleteDictationAudio(id);
    if(selectedDicAudioId === id) { setSelectedDicAudioId(''); setDicQuestions([]); }
    const res: any = await adminService.getDictationAudiosByTopic(Number(selectedDicTopicId));
    setDicAudios(Array.isArray(res) ? res : res.data || []);
  };

  const handleAddDicQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDicAudioId) return;
    await adminService.createDictationQuestion(Number(selectedDicAudioId), { startTime: Number(newDicQuestion.startTime), endTime: Number(newDicQuestion.endTime), transcript: newDicQuestion.transcript });
    setNewDicQuestion({ startTime: '', endTime: '', transcript: '' });
    const res: any = await adminService.getDictationQuestionsByAudio(Number(selectedDicAudioId));
    setDicQuestions(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteDicQuestion = async (id: number) => {
    if(!window.confirm('Xóa đoạn cắt này?')) return;
    await adminService.deleteDictationQuestion(id);
    const res: any = await adminService.getDictationQuestionsByAudio(Number(selectedDicAudioId));
    setDicQuestions(Array.isArray(res) ? res : res.data || []);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Bước 1: Chọn lớp học</label>
        <select className="w-full md:w-1/2 p-3 border border-gray-200 text-gray-700 rounded-xl outline-none focus:border-green-500" value={dicClassId} onChange={(e) => setDicClassId(Number(e.target.value))}>
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {dicClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 h-[600px] flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>📂</span> 1. Chủ đề</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Tên chủ đề..." className="flex-1 p-2 text-sm border rounded-lg outline-none focus:border-green-500" value={newDicTopicName} onChange={(e) => setNewDicTopicName(e.target.value)} />
              <button onClick={handleAddDicTopic} className="px-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">+</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {dicTopics.map(topic => (
                <div key={topic.id} className={`p-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${selectedDicTopicId === topic.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`} onClick={() => setSelectedDicTopicId(topic.id)}>
                  <span className="font-semibold text-gray-700 text-sm truncate">{topic.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDicTopic(topic.id); }} className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0 ml-2">Xóa</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 h-[600px] flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🎵</span> 2. Link Audio</h3>
            {!selectedDicTopicId ? ( <p className="text-sm text-gray-400 text-center mt-10">Chọn chủ đề trước</p> ) : (
              <>
                <div className="flex flex-col gap-2 mb-4">
                  <input type="text" placeholder="Dán link Mp3/Audio..." className="w-full p-2 text-sm border rounded-lg outline-none focus:border-green-500" value={newDicAudioUrl} onChange={(e) => setNewDicAudioUrl(e.target.value)} />
                  <button onClick={handleAddDicAudio} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Tạo Audio</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {dicAudios.map((audio, i) => (
                    <div key={audio.id} className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col gap-2 transition-all ${selectedDicAudioId === audio.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`} onClick={() => setSelectedDicAudioId(audio.id)}>
                      <div className="flex justify-between items-center"><span className="font-bold text-gray-700 text-sm">Audio {i + 1}</span><button onClick={(e) => { e.stopPropagation(); handleDeleteDicAudio(audio.id); }} className="text-red-400 hover:text-red-600 text-xs font-bold">Xóa</button></div>
                      <span className="text-xs text-gray-500 truncate" title={audio.audioUrl || audio.audio_url}>{audio.audioUrl || audio.audio_url}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 h-[600px] flex flex-col">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><span>✂️</span> 3. Cắt đoạn & Gắn Transcript</h3>
            {!selectedDicAudioId ? ( <p className="text-sm text-gray-400 text-center mt-10">Chọn Audio trước</p> ) : (
              <>
                <form onSubmit={handleAddDicQuestion} className="bg-slate-50 p-4 rounded-xl border border-gray-100 shadow-inner mb-4 flex flex-col gap-3 shrink-0">
                  <div className="flex gap-3">
                     <div className="w-1/2"><label className="text-xs font-bold text-gray-500 mb-1 block">Từ Giây (Start)</label><input required type="number" min="0" placeholder="VD: 0" className="w-full p-2 text-sm border rounded-lg outline-none focus:border-green-500" value={newDicQuestion.startTime} onChange={e => setNewDicQuestion({...newDicQuestion, startTime: e.target.value})} /></div>
                     <div className="w-1/2"><label className="text-xs font-bold text-gray-500 mb-1 block">Đến Giây (End)</label><input required type="number" min="1" placeholder="VD: 5" className="w-full p-2 text-sm border rounded-lg outline-none focus:border-green-500" value={newDicQuestion.endTime} onChange={e => setNewDicQuestion({...newDicQuestion, endTime: e.target.value})} /></div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-500 mb-1 block">Lời thoại (Transcript)</label><textarea required rows={2} placeholder="Nội dung cần chép chính tả..." className="w-full p-2 text-sm border rounded-lg outline-none focus:border-green-500 resize-none" value={newDicQuestion.transcript} onChange={e => setNewDicQuestion({...newDicQuestion, transcript: e.target.value})} /></div>
                  <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800">Thêm đoạn cắt</button>
                </form>
                <div className="flex-1 overflow-y-auto pr-1">
                   <div className="space-y-3">
                     {dicQuestions.map((q, i) => (
                       <div key={q.id} className="p-4 border border-gray-100 rounded-xl bg-white hover:border-green-300 transition-colors relative group">
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleDeleteDicQuestion(q.id)} className="text-red-400 hover:text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">Xóa</button></div>
                          <div className="flex items-center gap-2 mb-2"><span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">Đoạn {i + 1}</span><span className="text-xs font-mono text-gray-500">{q.startTime || q.start_time}s - {q.endTime || q.end_time}s</span></div>
                          <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-lg">{q.transcript}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DictationManagement;