import React, { useState, useEffect } from 'react';
import { bookingService, type TestEvent, type EventExamConfig } from '../../services/bookingService';
import { adminService } from '../../services/adminService';
import { mockTestService } from '../../services/mockTestService';

interface EventExamConfigModalProps {
  event: TestEvent;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function EventExamConfigModal({
  event,
  onClose,
  onSuccess,
  showToast
}: EventExamConfigModalProps) {
  const [examFormat, setExamFormat] = useState<string>(event.examFormat || 'ONLINE');
  const [skillType, setSkillType] = useState<string>(event.skillType || 'READING');
  const [durationMinutes, setDurationMinutes] = useState<number>(event.durationMinutes || 60);
  const [pdfUrl, setPdfUrl] = useState<string>(event.pdfUrl || '');
  const [audioUrl, setAudioUrl] = useState<string>(event.audioUrl || '');
  const [passageText, setPassageText] = useState<string>(event.passageText || '');
  const [allowReview, setAllowReview] = useState<boolean>(event.allowReview !== false);

  const [activeTab, setActiveTab] = useState<'READING' | 'LISTENING'>('READING');
  const [questions, setQuestions] = useState<Record<string, { text: string; answer: string }>>({});

  const [bulkInputOpen, setBulkInputOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tính năng Đồng bộ từ Đề Mock Test có sẵn trong hệ thống
  const [mockSyncOpen, setMockSyncOpen] = useState(false);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [mockTestsList, setMockTestsList] = useState<any[]>([]);
  const [selectedMockTestId, setSelectedMockTestId] = useState<number | ''>('');
  const [syncingMock, setSyncingMock] = useState(false);

  // Tải cấu hình và đáp án hiện tại
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const config = await bookingService.getExamConfigAdmin(event.id);
        if (config.examFormat) setExamFormat(config.examFormat);
        if (config.skillType) setSkillType(config.skillType);
        if (config.durationMinutes) setDurationMinutes(config.durationMinutes);
        if (config.pdfUrl) setPdfUrl(config.pdfUrl);
        if (config.audioUrl) setAudioUrl(config.audioUrl);
        if (config.passageText) setPassageText(config.passageText);
        if (config.allowReview !== undefined) setAllowReview(config.allowReview);

        if (config.questions && config.questions.length > 0) {
          const qMap: Record<string, { text: string; answer: string }> = {};
          config.questions.forEach((q) => {
            qMap[`${q.skill}_${q.questionNumber}`] = {
              text: q.questionText || '',
              answer: q.correctAnswer || ''
            };
          });
          setQuestions(qMap);
        } else {
          // Khởi tạo 40 câu hỏi mặc định
          initDefaultQuestions(config.skillType || skillType);
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình đề thi:', err);
        initDefaultQuestions(skillType);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [event.id]);

  const initDefaultQuestions = (skill: string) => {
    const qMap: Record<string, { text: string; answer: string }> = {};
    if (skill === 'READING' || skill === 'BOTH') {
      for (let i = 1; i <= 40; i++) {
        qMap[`READING_${i}`] = { text: '', answer: '' };
      }
    }
    if (skill === 'LISTENING' || skill === 'BOTH') {
      for (let i = 1; i <= 40; i++) {
        qMap[`LISTENING_${i}`] = { text: '', answer: '' };
      }
    }
    setQuestions(qMap);
  };

  // Cập nhật câu hỏi
  const handleQuestionChange = (skill: string, num: number, field: 'text' | 'answer', value: string) => {
    const key = `${skill}_${num}`;
    const cur = questions[key] || { text: '', answer: '' };
    setQuestions({
      ...questions,
      [key]: {
        ...cur,
        [field]: value
      }
    });
  };

  // Tính năng Nhập Nhanh Bulk Import từ Text
  const handleApplyBulkImport = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const updated = { ...questions };

    lines.forEach((line) => {
      // Regex phát hiện các định dạng như: "1. A", "1: TRUE", "1 - centre/center", "Câu 1: B"
      const match = line.match(/^(?:Câu\s*)?(\d+)[\.\:\-\s]+(.+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        const ans = match[2].trim();
        if (num >= 1 && num <= 40) {
          const key = `${activeTab}_${num}`;
          updated[key] = {
            ...(updated[key] || { text: '' }),
            answer: ans
          };
        }
      }
    });

    setQuestions(updated);
    setBulkInputOpen(false);
    setBulkText('');
    showToast(`Đã nhận diện và áp dụng đáp án cho phần ${activeTab}!`);
  };

  // Mở drawer nạp từ MockTest
  const handleToggleMockSync = async () => {
    const nextState = !mockSyncOpen;
    setMockSyncOpen(nextState);
    if (nextState && classesList.length === 0) {
      try {
        const res: any = await adminService.getAllClasses();
        const list = Array.isArray(res) ? res : res?.data || [];
        setClassesList(list);
        if (list.length > 0) {
          setSelectedClassId(list[0].id);
        }
      } catch (e) {
        console.error('Lỗi khi tải danh sách lớp học:', e);
      }
    }
  };

  // Khi chọn lớp -> tải danh sách đề thi của lớp
  useEffect(() => {
    if (selectedClassId) {
      mockTestService.getTestsByClass(Number(selectedClassId)).then((res: any) => {
        const tests = Array.isArray(res) ? res : res?.data || [];
        setMockTestsList(tests);
        if (tests.length > 0) {
          setSelectedMockTestId(tests[0].id);
        } else {
          setSelectedMockTestId('');
        }
      });
    }
  }, [selectedClassId]);

  // Áp dụng dữ liệu từ MockTest đã chọn vào đề thi TestEvent
  const handleApplyMockTestData = async () => {
    if (!selectedMockTestId) return;
    setSyncingMock(true);
    try {
      const selectedTest = mockTestsList.find((t) => t.id === Number(selectedMockTestId));
      if (!selectedTest) return;

      // 1. Nạp tài liệu PDF và Audio nếu có
      if (selectedTest.pdfUrl) {
        setPdfUrl(selectedTest.pdfUrl);
      }
      if (selectedTest.audioUrl) {
        setAudioUrl(selectedTest.audioUrl);
      }

      // Xác định skill đích dựa trên loại đề MockTest
      const targetSkill = selectedTest.type === 'LISTENING' ? 'LISTENING' : 'READING';
      if (skillType === 'BOTH') {
        setActiveTab(targetSkill);
      }

      // 2. Tải toàn bộ đáp án 40 câu hỏi của MockTest
      const answersRes: any = await mockTestService.getAnswers(Number(selectedMockTestId));
      const answersList = Array.isArray(answersRes) ? answersRes : answersRes?.data || [];

      const updated = { ...questions };
      answersList.forEach((q: any) => {
        const num = q.questionNumber || q.question_number;
        const text = q.questionText || q.question_text || '';
        const ans = q.correctAnswer || q.correct_answer || '';
        if (num >= 1 && num <= 40) {
          const key = `${targetSkill}_${num}`;
          updated[key] = {
            text: text,
            answer: ans
          };
        }
      });

      setQuestions(updated);
      setMockSyncOpen(false);
      showToast(`Đã đồng bộ thành công đề [${selectedTest.title}] vào phần ${targetSkill}!`);
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ đề Mock Test:', err);
      alert('Không thể tải dữ liệu đề thi thử!');
    } finally {
      setSyncingMock(false);
    }
  };

  // Lưu cấu hình
  const handleSave = async () => {
    setSaving(true);
    try {
      const questionList: Array<{ skill: string; questionNumber: number; questionText?: string; correctAnswer: string }> = [];

      Object.entries(questions).forEach(([key, val]) => {
        const [s, numStr] = key.split('_');
        if (val.answer && val.answer.trim()) {
          questionList.push({
            skill: s,
            questionNumber: Number(numStr),
            questionText: val.text,
            correctAnswer: val.answer.trim()
          });
        }
      });

      const payload: EventExamConfig = {
        examFormat,
        skillType,
        durationMinutes,
        pdfUrl,
        audioUrl,
        passageText,
        allowReview,
        questions: questionList
      };

      await bookingService.saveExamConfigAdmin(event.id, payload);
      showToast('Đã lưu cấu hình đề thi thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Có lỗi khi lưu đề thi!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 font-sans animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 md:px-7 md:py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <h3 className="text-sm font-black text-slate-900">Cấu Hình Đề Thi Online</h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {event.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Upload file PDF, Audio, soạn bài đọc và bảng 40 câu hỏi đáp án cho sự kiện
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold">Đang tải cấu hình đề thi...</div>
          ) : (
            <>
              {/* PHẦN 1: THIẾT LẬP CHUNG */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  1. Thông tin cấu hình phòng thi
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                  <div>
                    <label className="block mb-1 text-[11px] text-slate-500 uppercase tracking-wider">
                      Hình thức tổ chức
                    </label>
                    <select
                      value={examFormat}
                      onChange={(e) => setExamFormat(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600"
                    >
                      <option value="ONLINE">💻 Thi Trực Tuyến (Online Exam)</option>
                      <option value="OFFLINE">🏛️ Thi Trực Tiếp Tại Cơ Sở (Offline)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-[11px] text-slate-500 uppercase tracking-wider">
                      Kỹ năng thi
                    </label>
                    <select
                      value={skillType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSkillType(val);
                        initDefaultQuestions(val);
                        if (val === 'LISTENING') setActiveTab('LISTENING');
                        else setActiveTab('READING');
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600 text-blue-700 font-black"
                    >
                      <option value="READING">📖 READING (40 Câu)</option>
                      <option value="LISTENING">🎧 LISTENING (40 Câu)</option>
                      <option value="BOTH">🎯 CẢ HAI (Listening & Reading - 80 Câu)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-[11px] text-slate-500 uppercase tracking-wider">
                      Thời lượng làm bài (Phút)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="allowReview"
                    checked={allowReview}
                    onChange={(e) => setAllowReview(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="allowReview" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Cho phép học viên xem lại bài thi và đáp án chi tiết sau khi nộp
                  </label>
                </div>
              </div>

              {/* PHẦN 2: TÀI LIỆU ĐỀ THI (PDF, AUDIO, BÀI ĐỌC) */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  2. Tài liệu đề thi (File PDF, Audio & Văn bản bài đọc)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">
                      📄 Link File PDF Đề Thi:
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/ielts-reading-test.pdf"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Dán link Google Drive hoặc Cloudinary (cho phép nhúng PDF).</p>
                  </div>

                  {(skillType === 'LISTENING' || skillType === 'BOTH') && (
                    <div>
                      <label className="block mb-1 text-xs font-bold text-emerald-800">
                        🎧 Link File Audio (.mp3) phần Listening:
                      </label>
                      <input
                        type="text"
                        placeholder="https://example.com/audio/ielts-listening-track.mp3"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        className="w-full p-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium outline-none focus:border-emerald-600"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Hệ thống sẽ phát Audio trực tiếp trong phòng thi của học viên.</p>
                    </div>
                  )}
                </div>

                {/* Văn bản bài đọc để hỗ trợ chức năng Highlight */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🖍️</span>
                      <span>Văn bản bài đọc Reading (Hỗ trợ học viên Highlight & Bỏ Highlight):</span>
                    </label>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                      Khuyên dùng chuẩn thi IDP/BC
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Dán nội dung bài đọc Reading Passage 1, 2, 3 vào đây... Học viên sẽ có thể lấy chuột bôi đen chữ để Highlight và Bỏ Highlight trực tiếp khi thi!"
                    value={passageText}
                    onChange={(e) => setPassageText(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono leading-relaxed outline-none focus:border-blue-600 custom-scrollbar"
                  />
                </div>
              </div>

              {/* PHẦN 3: BẢNG KHAI BÁO 40 CÂU HỎI & ĐÁP ÁN CHUẨN */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      3. Khai báo Bảng Đáp Án Chuẩn (40 Câu)
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium">
                      💡 Mẹo: Có thể nhập nhiều đáp án đúng cách nhau bởi dấu gạch chéo <code className="text-emerald-700 font-bold">centre/center</code> hoặc <code className="text-emerald-700 font-bold">TRUE/T</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {skillType === 'BOTH' && (
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setActiveTab('READING')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'READING' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          📖 Reading
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('LISTENING')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'LISTENING' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🎧 Listening
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleToggleMockSync}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📥</span>
                      <span>Lấy từ Mock Test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkInputOpen(!bulkInputOpen)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>⚡</span>
                      <span>Dán Nhanh Đáp Án</span>
                    </button>
                  </div>
                </div>

                {/* Khung Đồng Bộ từ Mock Test có sẵn trong hệ thống */}
                {mockSyncOpen && (
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                        <span>📥</span> Đồng Bộ Đề & Đáp Án Từ Thư Viện Mock Test Có Sẵn
                      </span>
                      <button
                        type="button"
                        onClick={() => setMockSyncOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Chọn lớp học và đề thi thử đã tạo trong hệ thống. Toàn bộ link PDF, Audio và bảng 40 câu hỏi đáp án sẽ được tự động điền ngay lập tức.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-blue-900 tracking-wider mb-1">
                          1. Chọn Lớp Học
                        </label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                        >
                          {classesList.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-blue-900 tracking-wider mb-1">
                          2. Chọn Đề Mock Test Của Lớp
                        </label>
                        <select
                          value={selectedMockTestId}
                          onChange={(e) => setSelectedMockTestId(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                        >
                          {mockTestsList.length === 0 ? (
                            <option value="">(Lớp chưa có đề thi)</option>
                          ) : (
                            mockTestsList.map((t) => (
                              <option key={t.id} value={t.id}>
                                [{t.type}] {t.title}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMockSyncOpen(false)}
                        className="px-3 py-1.5 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        disabled={!selectedMockTestId || syncingMock}
                        onClick={handleApplyMockTestData}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{syncingMock ? 'Đang tải...' : '⚡ Nạp Đề & Đáp Án Này'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Khung Dán Nhanh Bulk Import */}
                {bulkInputOpen && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2 animate-[fadeIn_0.2s_ease-out]">
                    <span className="text-xs font-bold text-indigo-950 block">
                      📋 Dán danh sách đáp án hàng loạt cho phần {activeTab}:
                    </span>
                    <p className="text-[10px] text-indigo-800">
                      Hỗ trợ định dạng: <code className="bg-white px-1 py-0.5 rounded">1. TRUE</code>, <code className="bg-white px-1 py-0.5 rounded">2. FALSE</code>, <code className="bg-white px-1 py-0.5 rounded">3: A</code>... Hệ thống sẽ tự động tách số câu và đáp án.
                    </p>
                    <textarea
                      rows={5}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="1. TRUE&#10;2. NOT GIVEN&#10;3. FALSE&#10;4. A&#10;5. centre/center"
                      className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-mono outline-none focus:border-indigo-600"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkInputOpen(false)}
                        className="px-3 py-1 bg-white text-slate-600 rounded-lg text-xs font-bold border cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyBulkImport}
                        className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                      >
                        Áp dụng ngay
                      </button>
                    </div>
                  </div>
                )}

                {/* Danh sách 40 câu hỏi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {Array.from({ length: 40 }, (_, idx) => idx + 1).map((num) => {
                    const key = `${activeTab}_${num}`;
                    const cur = questions[key] || { text: '', answer: '' };
                    return (
                      <div
                        key={key}
                        className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col gap-1.5 focus-within:border-blue-500"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                          <span>Câu {num}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${cur.answer ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                            {cur.answer ? 'Đã có Đ/A' : 'Trống'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Đáp án đúng (VD: TRUE hoặc A/B)..."
                          value={cur.answer}
                          onChange={(e) => handleQuestionChange(activeTab, num, 'answer', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:px-7 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu Cấu Hình & Đề Thi'}
          </button>
        </div>
      </div>
    </div>
  );
}
