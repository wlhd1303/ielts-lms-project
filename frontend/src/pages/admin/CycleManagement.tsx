import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { mockTestService } from '../../services/mockTestService';
import { writingService } from '../../services/writingService';
import { cycleService, type StudyCyclePayload } from '../../services/cycleService';

const CycleManagement = () => {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  
  // Dữ liệu Vòng của lớp
  const [cycles, setCycles] = useState<any[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);

  // Kho tài nguyên bài tập của lớp để gán vào Vòng
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [vocabTopics, setVocabTopics] = useState<any[]>([]);
  const [dictationAudios, setDictationAudios] = useState<any[]>([]);
  const [speakingTopics, setSpeakingTopics] = useState<any[]>([]);
  const [writingTopics, setWritingTopics] = useState<any[]>([]);

  // State chỉnh sửa / tạo mới Vòng
  const [editingCycleId, setEditingCycleId] = useState<number | null>(null);
  const [cycleForm, setCycleForm] = useState<StudyCyclePayload>({
    cycleOrder: 1,
    cycleType: 'READING',
    title: '',
    mockTestId: null,
    vocabTopicId: null,
    dictationAudioId: null,
    speakingTopicId: null,
    writingTopicId: null,
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Tải danh sách lớp học
  useEffect(() => {
    adminService.getAllClasses().then((res: any) => {
      setAvailableClasses(Array.isArray(res) ? res : res.data || []);
    });
  }, []);

  // 2. Khi chọn lớp -> Tải các Vòng và kho tài nguyên của lớp
  useEffect(() => {
    if (!selectedClassId) return;

    loadClassData(Number(selectedClassId));
  }, [selectedClassId]);

  const loadClassData = async (classId: number) => {
    setIsLoadingCycles(true);
    try {
      // Tải danh sách vòng
      const cyclesRes: any = await cycleService.getCyclesByClass(classId);
      const cycleList = Array.isArray(cyclesRes) ? cyclesRes : cyclesRes.data || [];
      setCycles(cycleList);

      // Tải đề Mock Test của lớp
      const mockRes: any = await mockTestService.getTestsByClass(classId);
      setMockTests(Array.isArray(mockRes) ? mockRes : mockRes.data || []);

      // Tải Vocab Topics của lớp
      const vocabRes: any = await adminService.getTopicsByClass(classId);
      setVocabTopics(Array.isArray(vocabRes) ? vocabRes : vocabRes.data || []);

      // Tải Dictation Audios của lớp
      const dicTopicsRes: any = await adminService.getDictationTopicsByClass(classId);
      const dTopics = Array.isArray(dicTopicsRes) ? dicTopicsRes : dicTopicsRes.data || [];
      const audiosAccumulator: any[] = [];
      for (const dt of dTopics) {
        try {
          const aRes: any = await adminService.getDictationAudiosByTopic(dt.id);
          const aList = Array.isArray(aRes) ? aRes : aRes.data || [];
          aList.forEach((a: any) => {
            audiosAccumulator.push({ ...a, topicName: dt.name });
          });
        } catch (err) {
          // ignore
        }
      }
      setDictationAudios(audiosAccumulator);

      // Tải Speaking Topics của lớp
      const spkRes: any = await adminService.getSpeakingTopicsByClass(classId);
      setSpeakingTopics(Array.isArray(spkRes) ? spkRes : spkRes.data || []);

      // Tải Writing Topics của lớp
      const wrtRes: any = await writingService.getTopicsByClass(classId);
      setWritingTopics(Array.isArray(wrtRes) ? wrtRes : wrtRes.data || []);

      // Reset form
      resetForm(cycleList.length + 1);

    } catch (err) {
      console.error("Lỗi nạp dữ liệu Vòng học:", err);
    } finally {
      setIsLoadingCycles(false);
    }
  };

  const resetForm = (nextOrder = 1) => {
    setEditingCycleId(null);
    setCycleForm({
      cycleOrder: nextOrder,
      cycleType: 'READING',
      title: '',
      mockTestId: null,
      vocabTopicId: null,
      dictationAudioId: null,
      speakingTopicId: null,
      writingTopicId: null,
      isActive: true
    });
  };

  // Xử lý khi chọn Mock Test trong form
  const handleSelectMockTest = (mockTestIdStr: string) => {
    if (!mockTestIdStr) {
      setCycleForm({
        ...cycleForm,
        mockTestId: null
      });
      return;
    }

    const testId = Number(mockTestIdStr);
    const selectedMock = mockTests.find(t => t.id === testId);

    if (selectedMock) {
      const type = selectedMock.type?.toUpperCase() || 'READING';
      const order = cycleForm.cycleOrder || (cycles.length + 1);
      const isReading = type === 'READING';

      setCycleForm({
        ...cycleForm,
        mockTestId: testId,
        cycleType: type,
        title: cycleForm.title ? cycleForm.title : `Vòng ${order}: ${selectedMock.title} (${type})`,
        dictationAudioId: isReading ? null : cycleForm.dictationAudioId // Tự động reset dictation nếu là Reading
      });
    }
  };

  // Lưu Vòng (Tạo mới hoặc Cập nhật)
  const handleSubmitCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    setIsSubmitting(true);
    try {
      if (editingCycleId) {
        await cycleService.updateCycle(editingCycleId, cycleForm);
        alert("Cập nhật Vòng học thành công!");
      } else {
        await cycleService.createCycle(Number(selectedClassId), cycleForm);
        alert("Thêm Vòng học mới thành công!");
      }

      await loadClassData(Number(selectedClassId));
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi lưu Vòng học!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chọn 1 Vòng để chỉnh sửa
  const handleEditCycle = (cycle: any) => {
    setEditingCycleId(cycle.id);
    setCycleForm({
      cycleOrder: cycle.cycleOrder,
      cycleType: cycle.cycleType || 'READING',
      title: cycle.title || '',
      mockTestId: cycle.mockTest ? cycle.mockTest.id : null,
      vocabTopicId: cycle.vocabTopic ? cycle.vocabTopic.id : null,
      dictationAudioId: cycle.dictationAudio ? cycle.dictationAudio.id : null,
      speakingTopicId: cycle.speakingTopic ? cycle.speakingTopic.id : null,
      writingTopicId: cycle.writingTopic ? cycle.writingTopic.id : null,
      isActive: cycle.isActive !== false
    });
  };

  // Xóa Vòng
  const handleDeleteCycle = async (cycleId: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa Vòng học này?")) return;

    try {
      await cycleService.deleteCycle(cycleId);
      await loadClassData(Number(selectedClassId));
    } catch (err) {
      alert("Lỗi khi xóa Vòng học!");
    }
  };

  // ⚡ TỰ ĐỘNG TẠO VÒNG XEN KẼ TỪ DỮ LIỆU HIỆN CÓ CỦA LỚP
  const handleAutoGenerate = async () => {
    if (!selectedClassId) return;

    if (!window.confirm(
      "Hệ thống sẽ tự động ghép các đề Reading & Listening sẵn có thành các Vòng xen kẽ chuẩn hóa (và tự gán các bài Vocab, Dictation, Speaking, Writing tương ứng).\n\nBạn có muốn tiếp tục?"
    )) {
      return;
    }

    setIsLoadingCycles(true);
    try {
      const res: any = await cycleService.autoGenerateCycles(Number(selectedClassId));
      const generatedList = Array.isArray(res) ? res : res.data || [];
      alert(`🎉 Đã tự động tạo thành công ${generatedList.length} Vòng học xen kẽ!`);
      await loadClassData(Number(selectedClassId));
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tự động sinh Vòng học!");
    } finally {
      setIsLoadingCycles(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* STEP 1: CHỌN LỚP HỌC */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Bước 1: Chọn Lớp Học Quản Lý Vòng
          </label>
          <p className="text-xs text-slate-500 font-medium">
            Thiết lập các Vòng học tập (Cycles) xen kẽ Reading & Listening, liên kết bài chuẩn bị với đề Mock Test
          </p>
        </div>
        <select 
          className="w-full md:w-72 p-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-slate-50/50" 
          value={selectedClassId} 
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
        >
          <option value="" disabled>-- Chọn Lớp Học --</option>
          {availableClasses.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <>
          {/* BANNER THAO TÁC NHANH: TỰ ĐỘNG TẠO VÒNG */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-base font-black tracking-tight">Tự Động Tạo Chuỗi Vòng Xen Kẽ</h3>
              </div>
              <p className="text-xs text-blue-100 font-medium max-w-2xl leading-relaxed">
                Hệ thống sẽ tự động quét toàn bộ đề Reading & Listening hiện có trong lớp của Thầy, tự động sắp xếp xen kẽ, tự bỏ qua bước Dictation ở đề Reading và ghép cặp các bài từ vựng, luyện nói, luyện viết sẵn có.
              </p>
            </div>

            <button 
              onClick={handleAutoGenerate}
              disabled={isLoadingCycles}
              className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl text-xs shadow-md active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              {isLoadingCycles ? "Đang xử lý..." : "⚡ Tạo Vòng Tự Động Ngay"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* CỘT TRÁI: DANH SÁCH CÁC VÒNG (7 CỘT) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <h3 className="text-sm font-black text-slate-900">
                    Danh Sách Vòng Học ({cycles.length} Vòng)
                  </h3>
                </div>

                <button
                  onClick={() => resetForm(cycles.length + 1)}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  + Thêm Vòng Mới
                </button>
              </div>

              {isLoadingCycles ? (
                <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse">
                  Đang tải danh sách các Vòng...
                </div>
              ) : cycles.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <span className="text-4xl block">📭</span>
                  <p className="text-xs font-bold text-slate-500">Lớp này chưa có Vòng học nào được thiết lập.</p>
                  <p className="text-[11px] text-slate-400">
                    Bấm nút <span className="font-bold text-blue-600">"Tạo Vòng Tự Động Ngay"</span> ở trên hoặc tạo thủ công ở cột bên phải.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  {cycles.map((cycle) => {
                    const isReading = cycle.cycleType === 'READING';
                    const isEditing = editingCycleId === cycle.id;

                    return (
                      <div 
                        key={cycle.id}
                        onClick={() => handleEditCycle(cycle)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative space-y-3 ${
                          isEditing 
                            ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20' 
                            : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              #{cycle.cycleOrder}
                            </span>
                            <h4 className="font-black text-slate-900 text-xs">
                              {cycle.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                              isReading 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isReading ? '📖 Reading (4 ngày)' : '🎧 Listening (5 ngày)'}
                            </span>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteCycle(cycle.id); }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Xóa vòng"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* CHI TIẾT CÁC BÀI HỌC TRONG VÒNG */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {/* Bước 1: Dictation (chỉ có ở Lis) */}
                          <div className={`p-2 rounded-xl text-[10px] border ${
                            isReading 
                              ? 'bg-slate-100/70 border-dashed border-slate-300 text-slate-400' 
                              : cycle.dictationAudio 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            <span className="block font-black text-[9px] uppercase tracking-wider mb-0.5">1. Dictation</span>
                            {isReading ? '⚡ Đã Skip (Đề Đọc)' : (cycle.dictationAudio ? `Audio #${cycle.dictationAudio.id}` : 'Chưa gán')}
                          </div>

                          {/* Bước 2: Vocab */}
                          <div className={`p-2 rounded-xl text-[10px] border ${
                            cycle.vocabTopic 
                              ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold' 
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            <span className="block font-black text-[9px] uppercase tracking-wider mb-0.5">
                              {isReading ? '1. Từ vựng' : '2. Từ vựng'}
                            </span>
                            <span className="truncate block" title={cycle.vocabTopic?.name}>
                              {cycle.vocabTopic ? cycle.vocabTopic.name : 'Chưa gán'}
                            </span>
                          </div>

                          {/* Bước 3: Speaking / Writing */}
                          <div className={`p-2 rounded-xl text-[10px] border ${
                            cycle.speakingTopic 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold' 
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            <span className="block font-black text-[9px] uppercase tracking-wider mb-0.5">
                              {isReading ? '2. Speaking' : '3. Speaking'}
                            </span>
                            <span className="truncate block" title={cycle.speakingTopic?.name}>
                              {cycle.speakingTopic ? cycle.speakingTopic.name : 'Tùy chọn'}
                            </span>
                          </div>

                          {/* Bước 4: Đích Mock Test */}
                          <div className={`p-2 rounded-xl text-[10px] border ${
                            cycle.mockTest 
                              ? 'bg-blue-600 text-white font-black shadow-sm' 
                              : 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                          }`}>
                            <span className="block text-[9px] uppercase tracking-wider mb-0.5 text-blue-200">
                              {isReading ? '4. Mock Test 🎯' : '5. Mock Test 🎯'}
                            </span>
                            <span className="truncate block" title={cycle.mockTest?.title}>
                              {cycle.mockTest ? cycle.mockTest.title : 'Chưa chọn đề!'}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CỘT PHẢI: FORM TẠO / SỬA VÒNG (5 CỘT) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>⚙️</span> {editingCycleId ? `Cập Nhật Vòng #${cycleForm.cycleOrder}` : "Tạo Vòng Mới"}
                </h3>

                {editingCycleId && (
                  <button
                    onClick={() => resetForm(cycles.length + 1)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitCycle} className="space-y-4">
                
                {/* 1. CHỌN ĐỀ MOCK TEST ĐÍCH CỦA VÒNG */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    1. Chọn Đề Mock Test Đích (Bắt buộc)
                  </label>
                  <select 
                    required
                    className="w-full p-2.5 text-xs font-bold border rounded-xl outline-none focus:border-blue-600 bg-slate-50/50"
                    value={cycleForm.mockTestId || ''}
                    onChange={(e) => handleSelectMockTest(e.target.value)}
                  >
                    <option value="">-- Chọn đề thi thử cuối vòng --</option>
                    {mockTests.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.type}] {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* THÔNG BÁO TỰ ĐỘNG SKIP NẾU LÀ READING */}
                {cycleForm.cycleType === 'READING' ? (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs font-semibold text-blue-900 flex items-start gap-2.5">
                    <span className="text-base">ℹ️</span>
                    <div>
                      <p className="font-bold">Vòng READING (4 ngày)</p>
                      <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                        Đề Reading không có Audio nên hệ thống <strong>tự động bỏ qua (skip)</strong> bài Nghe chép chính tả (Dictation) cho vòng này.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-900 flex items-start gap-2.5">
                    <span className="text-base">🎧</span>
                    <div>
                      <p className="font-bold">Vòng LISTENING (5 ngày)</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                        Vòng Nghe có đầy đủ bài Nghe chép chính tả (Dictation) để học viên luyện tai nghe trước khi vào đề thi thật.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. CHỌN BÀI NGHE CHÉP (DICTATION AUDIO) - CHỈ BẬT KHI LÀ LISTENING */}
                {cycleForm.cycleType === 'LISTENING' && (
                  <div>
                    <label className="block text-[11px] font-black uppercase text-emerald-700 tracking-wider mb-1">
                      2. Bài Nghe Chép Chính Tả (Dictation Audio)
                    </label>
                    <select 
                      className="w-full p-2.5 text-xs font-semibold border rounded-xl outline-none focus:border-emerald-600 bg-white"
                      value={cycleForm.dictationAudioId || ''}
                      onChange={(e) => setCycleForm({ ...cycleForm, dictationAudioId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">-- Chọn bài nghe chép chính tả --</option>
                      {dictationAudios.map(a => (
                        <option key={a.id} value={a.id}>
                          [{a.topicName}] Audio #{a.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. CHỌN BỘ TỪ VỰNG CHUẨN BỊ (VOCAB TOPIC) */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-purple-700 tracking-wider mb-1">
                    {cycleForm.cycleType === 'READING' ? '2. Bộ Từ Vựng Bài Đọc' : '3. Bộ Từ Vựng Bài Nghe'}
                  </label>
                  <select 
                    className="w-full p-2.5 text-xs font-semibold border rounded-xl outline-none focus:border-purple-600 bg-white"
                    value={cycleForm.vocabTopicId || ''}
                    onChange={(e) => setCycleForm({ ...cycleForm, vocabTopicId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">-- Chọn bộ từ vựng chuẩn bị --</option>
                    {vocabTopics.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. CHỌN CHỦ ĐỀ SPEAKING */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-indigo-700 tracking-wider mb-1">
                    {cycleForm.cycleType === 'READING' ? '3. Bài Luyện Nói (Speaking)' : '4. Bài Luyện Nói (Speaking)'}
                  </label>
                  <select 
                    className="w-full p-2.5 text-xs font-semibold border rounded-xl outline-none focus:border-indigo-600 bg-white"
                    value={cycleForm.speakingTopicId || ''}
                    onChange={(e) => setCycleForm({ ...cycleForm, speakingTopicId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">-- (Tùy chọn) Chọn chủ đề Speaking --</option>
                    {speakingTopics.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. CHỌN CHỦ ĐỀ WRITING */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-rose-700 tracking-wider mb-1">
                    {cycleForm.cycleType === 'READING' ? '4. Bài Luyện Dịch Câu (Writing)' : '5. Bài Luyện Dịch Câu (Writing)'}
                  </label>
                  <select 
                    className="w-full p-2.5 text-xs font-semibold border rounded-xl outline-none focus:border-rose-600 bg-white"
                    value={cycleForm.writingTopicId || ''}
                    onChange={(e) => setCycleForm({ ...cycleForm, writingTopicId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">-- (Tùy chọn) Chọn chủ đề Writing --</option>
                    {writingTopics.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* THÔNG TIN TÊN VÒNG & THỨ TỰ */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Thứ Tự Vòng</label>
                    <input 
                      type="number" 
                      min="1" 
                      required
                      className="w-full p-2.5 text-xs font-black border rounded-xl outline-none bg-slate-50"
                      value={cycleForm.cycleOrder || 1}
                      onChange={(e) => setCycleForm({ ...cycleForm, cycleOrder: Number(e.target.value) })}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tên Hiển Thị Của Vòng</label>
                    <input 
                      type="text" 
                      required
                      placeholder="VD: Vòng 1: Cam 18 Test 1..."
                      className="w-full p-2.5 text-xs font-bold border rounded-xl outline-none focus:border-blue-600 bg-white"
                      value={cycleForm.title || ''}
                      onChange={(e) => setCycleForm({ ...cycleForm, title: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !cycleForm.mockTestId}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                >
                  {isSubmitting 
                    ? "Đang lưu..." 
                    : (editingCycleId ? "Cập Nhật Vòng Học" : "+ Lưu & Thêm Vòng Mới")}
                </button>

              </form>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default CycleManagement;
