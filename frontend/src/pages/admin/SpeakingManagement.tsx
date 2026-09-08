import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const SpeakingManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [speakingClassId, setSpeakingClassId] = useState<number | ''>('');
  
  const [speakingTopics, setSpeakingTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | ''>('');
  const [newTopicName, setNewTopicName] = useState('');

  const [sentences, setSentences] = useState<any[]>([]);
  const [newSentence, setNewSentence] = useState({ 
    englishSentence: '', 
    vietnameseMeaning: '', 
    orderIndex: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Tải danh sách lớp học
  useEffect(() => {
    adminService.getAllClasses().then((res: any) => 
      setAvailableClasses(Array.isArray(res) ? res : res.data || [])
    );
  }, []);

  // 2. Khi chọn lớp -> Lấy danh sách Topics
  useEffect(() => {
    if (speakingClassId) {
      fetchTopics();
    } else {
      setSpeakingTopics([]);
      setSelectedTopicId('');
      setSentences([]);
    }
  }, [speakingClassId]);

  // 3. Khi chọn Topic -> Lấy danh sách Sentences
  useEffect(() => {
    if (selectedTopicId) {
      fetchSentences();
    } else {
      setSentences([]);
    }
  }, [selectedTopicId]);

  const fetchTopics = async () => {
    if (!speakingClassId) return;
    try {
      const res: any = await adminService.getSpeakingTopicsByClass(Number(speakingClassId));
      setSpeakingTopics(Array.isArray(res) ? res : res.data || []);
      setSelectedTopicId('');
      setSentences([]);
    } catch (error) {
      console.error("Lỗi lấy danh sách chủ đề Speaking:", error);
    }
  };

  const fetchSentences = async () => {
    if (!selectedTopicId) return;
    try {
      const res: any = await adminService.getSpeakingSentencesByTopic(Number(selectedTopicId));
      setSentences(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error("Lỗi lấy câu luyện nói:", error);
    }
  };

  // Thêm Topic mới
  const handleAddTopic = async () => {
    if (!speakingClassId || !newTopicName.trim()) return;
    try {
      await adminService.createSpeakingTopic(Number(speakingClassId), newTopicName.trim());
      setNewTopicName('');
      const res: any = await adminService.getSpeakingTopicsByClass(Number(speakingClassId));
      setSpeakingTopics(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      alert("Lỗi khi tạo chủ đề Speaking mới!");
    }
  };

  // Xóa Topic
  const handleDeleteTopic = async (id: number) => {
    if (!window.confirm('Xóa chủ đề này sẽ xóa toàn bộ các câu luyện nói bên trong? Tiếp tục?')) return;
    try {
      await adminService.deleteSpeakingTopic(id);
      if (selectedTopicId === id) {
        setSelectedTopicId('');
        setSentences([]);
      }
      const res: any = await adminService.getSpeakingTopicsByClass(Number(speakingClassId));
      setSpeakingTopics(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      alert("Lỗi khi xóa chủ đề!");
    }
  };

  // Thêm câu luyện nói mới vào Topic
  const handleAddSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !newSentence.englishSentence.trim()) return;

    setIsSubmitting(true);
    try {
      await adminService.createSpeakingSentence(Number(selectedTopicId), {
        englishSentence: newSentence.englishSentence.trim(),
        vietnameseMeaning: newSentence.vietnameseMeaning.trim(),
        orderIndex: newSentence.orderIndex ? Number(newSentence.orderIndex) : sentences.length + 1
      });
      setNewSentence({ englishSentence: '', vietnameseMeaning: '', orderIndex: '' });
      await fetchSentences();
    } catch (error) {
      alert("Lỗi khi thêm câu luyện nói!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa câu luyện nói
  const handleDeleteSentence = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu luyện nói này?')) return;
    try {
      await adminService.deleteSpeakingSentence(id);
      await fetchSentences();
    } catch (error) {
      alert("Lỗi khi xóa câu!");
    }
  };

  // Phát âm thử âm thanh câu mẫu
  const handleSpeakSample = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Trình duyệt không hỗ trợ phát âm!");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* BƯỚC 1: CHỌN LỚP */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý
          </label>
          <p className="text-xs text-slate-500 font-medium">Chọn lớp học để quản lý danh sách chủ đề bài tập Speaking / Shadowing</p>
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
          
          {/* BƯỚC 2: QUẢN LÝ CHỦ ĐỀ (TOPIC) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📂</span> Chủ đề Speaking
            </h3>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Tên chủ đề mới (VD: Daily Life)..." 
                className="flex-1 p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500" 
                value={newTopicName} 
                onChange={(e) => setNewTopicName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
              />
              <button 
                onClick={handleAddTopic} 
                className="px-4 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
              {speakingTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Chưa có chủ đề nào trong lớp này.</p>
              ) : (
                speakingTopics.map(topic => (
                  <div 
                    key={topic.id} 
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      selectedTopicId === topic.id 
                        ? 'border-amber-500 bg-amber-50/60 shadow-sm' 
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">🎙️</span>
                      <span className="font-bold text-slate-800 text-xs truncate">{topic.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }} 
                      className="text-rose-500 hover:text-rose-700 text-[11px] font-bold px-2 py-1 rounded-md hover:bg-rose-50 transition-colors shrink-0 ml-2"
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
                <p className="text-xs">Vui lòng chọn một Chủ đề ở cột bên trái để thêm/sửa câu luyện nói</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>💬</span> Danh sách Câu Luyện Nói ({sentences.length})
                  </h3>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    Chủ đề: {speakingTopics.find(t => t.id === selectedTopicId)?.name}
                  </span>
                </div>

                {/* FORM THÊM CÂU MỚI */}
                <form onSubmit={handleAddSentence} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      1. Câu tiếng Anh chuẩn (để học viên đọc theo - Shadowing) *
                    </label>
                    <textarea 
                      required 
                      rows={3} 
                      placeholder="VD: Regular exercise has a positive effect on mental health." 
                      className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white resize-none" 
                      value={newSentence.englishSentence} 
                      onChange={(e) => setNewSentence({ ...newSentence, englishSentence: e.target.value })} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        2. Nghĩa tiếng Việt (tùy chọn)
                      </label>
                      <input 
                        type="text" 
                        placeholder="VD: Tập thể dục thường xuyên có tác động tích cực đến sức khỏe tinh thần." 
                        className="w-full p-2.5 text-xs font-medium border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white" 
                        value={newSentence.vietnameseMeaning} 
                        onChange={(e) => setNewSentence({ ...newSentence, vietnameseMeaning: e.target.value })} 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Thứ tự (Order)
                      </label>
                      <input 
                        type="number" 
                        placeholder={`VD: ${sentences.length + 1}`} 
                        className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500 bg-white" 
                        value={newSentence.orderIndex} 
                        onChange={(e) => setNewSentence({ ...newSentence, orderIndex: e.target.value })} 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang thêm câu...' : '+ Thêm Câu Luyện Nói Mới'}
                  </button>
                </form>

                {/* DANH SÁCH CÁC CÂU TRONG TOPIC */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {sentences.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">
                      Chủ đề này chưa có câu luyện nói nào. Hãy thêm câu đầu tiên ở trên!
                    </p>
                  ) : (
                    sentences.map((sentence, idx) => (
                      <div 
                        key={sentence.id} 
                        className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 transition-all space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                            Câu {sentence.orderIndex ?? (idx + 1)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => handleSpeakSample(sentence.englishSentence)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Nghe phát âm chuẩn"
                            >
                              <span>🔊</span> Nghe thử
                            </button>

                            <button 
                              onClick={() => handleDeleteSentence(sentence.id)} 
                              className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-slate-900 leading-relaxed">
                          "{sentence.englishSentence}"
                        </p>

                        {sentence.vietnameseMeaning && (
                          <p className="text-xs text-slate-500 font-medium italic border-t border-slate-100 pt-1.5">
                            👉 {sentence.vietnameseMeaning}
                          </p>
                        )}
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

export default SpeakingManagement;