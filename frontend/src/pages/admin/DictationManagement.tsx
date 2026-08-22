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

  // ⚡ HÀM CHUYỂN ĐỔI SỐ GIÂY SANG ĐỊNH DẠNG PHÚT:GIÂY (MM:SS)
  const formatTime = (totalSeconds: number | string): string => {
    const sec = Number(totalSeconds);
    if (isNaN(sec) || sec < 0) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    if(!window.confirm('Xóa chủ đề và toàn bộ dữ liệu nghe liên quan?')) return;
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
    if(!window.confirm('Xóa file Audio này?')) return;
    await adminService.deleteDictationAudio(id);
    if(selectedDicAudioId === id) { setSelectedDicAudioId(''); setDicQuestions([]); }
    const res: any = await adminService.getDictationAudiosByTopic(Number(selectedDicTopicId));
    setDicAudios(Array.isArray(res) ? res : res.data || []);
  };

  const handleAddDicQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDicAudioId) return;
    await adminService.createDictationQuestion(Number(selectedDicAudioId), { 
      startTime: Number(newDicQuestion.startTime), 
      endTime: Number(newDicQuestion.endTime), 
      transcript: newDicQuestion.transcript 
    });
    setNewDicQuestion({ startTime: '', endTime: '', transcript: '' });
    const res: any = await adminService.getDictationQuestionsByAudio(Number(selectedDicAudioId));
    setDicQuestions(Array.isArray(res) ? res : res.data || []);
  };

  const handleDeleteDicQuestion = async (id: number) => {
    if(!window.confirm('Xóa đoạn cắt câu hỏi này?')) return;
    await adminService.deleteDictationQuestion(id);
    const res: any = await adminService.getDictationQuestionsByAudio(Number(selectedDicAudioId));
    setDicQuestions(Array.isArray(res) ? res : res.data || []);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* STEP 1: CLASS SELECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Tải danh sách chủ đề Nghe chép chính tả (Dictation) của lớp</p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 bg-slate-50/50" 
          value={dicClassId} 
          onChange={(e) => setDicClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
        </select>
      </div>

      {dicClassId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* STEP 2: TOPICS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📂</span> 1. Chủ đề Nghe
            </h3>
            
            <div className="flex gap-2">
              <input type="text" placeholder="Tên chủ đề..." className="flex-1 p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-emerald-600" value={newDicTopicName} onChange={(e) => setNewDicTopicName(e.target.value)} />
              <button onClick={handleAddDicTopic} className="px-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer">+</button>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {dicTopics.map(topic => (
                <div key={topic.id} onClick={() => setSelectedDicTopicId(topic.id)} className={`p-3 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedDicTopicId === topic.id ? 'border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200/80 hover:bg-slate-50'}`}>
                  <span className="font-bold text-slate-800 text-xs truncate">{topic.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDicTopic(topic.id); }} className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer">Xóa</button>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: AUDIO LINK */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎵</span> 2. Link Audio MP3
            </h3>
            {!selectedDicTopicId ? (
              <p className="text-xs text-slate-400 text-center py-12 font-medium">👈 Chọn chủ đề trước</p>
            ) : (
              <>
                <div className="space-y-2">
                  <input type="text" placeholder="Dán link Mp3/Audio Cloud..." className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-emerald-600" value={newDicAudioUrl} onChange={(e) => setNewDicAudioUrl(e.target.value)} />
                  <button onClick={handleAddDicAudio} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm cursor-pointer">Tạo Audio</button>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                  {dicAudios.map((audio, i) => (
                    <div key={audio.id} onClick={() => setSelectedDicAudioId(audio.id)} className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${selectedDicAudioId === audio.id ? 'border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200/80 hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-xs">Audio #{i + 1}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDicAudio(audio.id); }} className="text-rose-500 text-[10px] font-bold cursor-pointer">Xóa</button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate" title={audio.audioUrl || audio.audio_url}>{audio.audioUrl || audio.audio_url}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* STEP 4: CUT & TRANSCRIPT */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm col-span-1 lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>✂️</span> 3. Cắt Khung Giây & Gắn Lời Thoại (Transcript)
            </h3>
            {!selectedDicAudioId ? (
              <p className="text-xs text-slate-400 text-center py-16 font-medium">👈 Chọn file Audio ở bước 2</p>
            ) : (
              <>
                <form onSubmit={handleAddDicQuestion} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                       <div className="flex items-center justify-between mb-1">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Từ Giây (Start)</label>
                         {newDicQuestion.startTime !== '' && (
                           <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                             {formatTime(newDicQuestion.startTime)}
                           </span>
                         )}
                       </div>
                       <input required type="number" min="0" placeholder="VD: 0 hoặc 75" className="w-full p-2 text-xs border rounded-xl outline-none font-bold bg-white focus:border-emerald-600" value={newDicQuestion.startTime} onChange={e => setNewDicQuestion({...newDicQuestion, startTime: e.target.value})} />
                     </div>

                     <div>
                       <div className="flex items-center justify-between mb-1">
                         <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Đến Giây (End)</label>
                         {newDicQuestion.endTime !== '' && (
                           <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                             {formatTime(newDicQuestion.endTime)}
                           </span>
                         )}
                       </div>
                       <input required type="number" min="1" placeholder="VD: 5 hoặc 85" className="w-full p-2 text-xs border rounded-xl outline-none font-bold bg-white focus:border-emerald-600" value={newDicQuestion.endTime} onChange={e => setNewDicQuestion({...newDicQuestion, endTime: e.target.value})} />
                     </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Lời thoại bắt buộc chép</label>
                    <textarea required rows={2} placeholder="Nội dung chính xác cần học viên nghe chép..." className="w-full p-2 text-xs border rounded-xl outline-none resize-none font-medium bg-white focus:border-emerald-600" value={newDicQuestion.transcript} onChange={e => setNewDicQuestion({...newDicQuestion, transcript: e.target.value})} />
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer">
                    + Thêm Đoạn Cắt Câu Hỏi
                  </button>
                </form>

                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {dicQuestions.map((q, i) => {
                    const start = Number(q.startTime || q.start_time || 0);
                    const end = Number(q.endTime || q.end_time || 0);

                    return (
                      <div key={q.id} className="p-3.5 border border-slate-200/80 rounded-2xl bg-white hover:border-emerald-300 transition-colors relative group space-y-1.5">
                         <button onClick={() => handleDeleteDicQuestion(q.id)} className="absolute top-3 right-3 text-rose-500 hover:bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Xóa</button>
                         <div className="flex items-center gap-2">
                           <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Đoạn #{i + 1}</span>
                           <span className="text-[11px] font-mono text-slate-500 font-semibold">
                             {formatTime(start)} - {formatTime(end)} ({start}s - {end}s)
                           </span>
                         </div>
                         <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{q.transcript}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default DictationManagement;