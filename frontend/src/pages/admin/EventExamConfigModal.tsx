import React, { useState, useEffect } from 'react';
import { bookingService, type TestEvent, type EventExamConfig } from '../../services/bookingService';
import { adminService } from '../../services/adminService';
import { mockTestService } from '../../services/mockTestService';
import {
  type PassageData,
  type ExamQuestionType,
  DEFAULT_PASSAGES,
  parsePassageData,
  serializePassageData,
  parseQuestionData,
  serializeQuestionData
} from '../../types/eventExamTypes';

interface EventExamConfigModalProps {
  event: TestEvent;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface QuestionConfigItem {
  prompt: string;
  type: ExamQuestionType;
  imageUrl?: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
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
  const [allowReview, setAllowReview] = useState<boolean>(event.allowReview !== false);

  // Quản lý 3 bài đọc (Passage 1, 2, 3)
  const [passages, setPassages] = useState<PassageData[]>(DEFAULT_PASSAGES);
  const [editingPassageTab, setEditingPassageTab] = useState<number>(1);

  // Quản lý Tab kỹ năng khi chọn BOTH
  const [activeTab, setActiveTab] = useState<'READING' | 'LISTENING'>('READING');

  // Lọc câu hỏi theo Passage (All, 1-13, 14-26, 27-40)
  const [questionFilter, setQuestionFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3'>('ALL');

  // Danh sách 40 câu hỏi chi tiết
  const [questions, setQuestions] = useState<Record<string, QuestionConfigItem>>({});

  // Xem trước ảnh lớn (Lightbox Modal)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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
        if (config.allowReview !== undefined) setAllowReview(config.allowReview);

        if (config.passageText) {
          setPassages(parsePassageData(config.passageText));
        }

        if (config.questions && config.questions.length > 0) {
          const qMap: Record<string, QuestionConfigItem> = {};
          config.questions.forEach((q) => {
            const parsed = parseQuestionData(q.questionText);
            qMap[`${q.skill}_${q.questionNumber}`] = {
              prompt: parsed.prompt || '',
              type: parsed.type || 'FILL_IN_BLANK',
              imageUrl: parsed.imageUrl || '',
              options: {
                A: parsed.options?.A || '',
                B: parsed.options?.B || '',
                C: parsed.options?.C || '',
                D: parsed.options?.D || ''
              },
              answer: q.correctAnswer || ''
            };
          });
          setQuestions(qMap);
        } else {
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
    const qMap: Record<string, QuestionConfigItem> = {};
    const skillsToInit = skill === 'BOTH' ? ['READING', 'LISTENING'] : [skill];
    skillsToInit.forEach((s) => {
      for (let i = 1; i <= 40; i++) {
        qMap[`${s}_${i}`] = {
          prompt: '',
          type: 'FILL_IN_BLANK',
          imageUrl: '',
          options: { A: '', B: '', C: '', D: '' },
          answer: ''
        };
      }
    });
    setQuestions(qMap);
  };

  // Cập nhật thông tin Passage
  const handlePassageChange = (id: number, field: keyof PassageData, value: string) => {
    setPassages((prev) => {
      const exists = prev.some((p) => p.id === id);
      if (exists) {
        return prev.map((p) => (p.id === id ? { ...p, [field]: value } : p));
      } else {
        return [
          ...prev,
          {
            id,
            title: `Part / Passage ${id}`,
            instruction: '',
            imageUrl: '',
            content: '',
            [field]: value,
          },
        ];
      }
    });
  };

  // Cập nhật câu hỏi
  const handleQuestionFieldChange = (
    skill: string,
    num: number,
    field: 'prompt' | 'type' | 'imageUrl' | 'answer',
    value: any
  ) => {
    const key = `${skill}_${num}`;
    const cur = questions[key] || {
      prompt: '',
      type: 'FILL_IN_BLANK',
      imageUrl: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: ''
    };
    setQuestions({
      ...questions,
      [key]: {
        ...cur,
        [field]: value
      }
    });
  };

  // Cập nhật tùy chọn A, B, C, D của Multiple Choice
  const handleOptionChange = (
    skill: string,
    num: number,
    optKey: 'A' | 'B' | 'C' | 'D',
    value: string
  ) => {
    const key = `${skill}_${num}`;
    const cur = questions[key] || {
      prompt: '',
      type: 'MULTIPLE_CHOICE',
      imageUrl: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: ''
    };
    setQuestions({
      ...questions,
      [key]: {
        ...cur,
        options: {
          ...cur.options,
          [optKey]: value
        }
      }
    });
  };

  // Tính năng Nhập Nhanh Bulk Import từ Text
  const handleApplyBulkImport = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const updated = { ...questions };

    lines.forEach((line) => {
      const match = line.match(/^(?:Câu\s*)?(\d+)[\.\:\-\s]+(.+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        const ans = match[2].trim();
        if (num >= 1 && num <= 40) {
          const key = `${activeTab}_${num}`;
          const cur = updated[key] || {
            prompt: '',
            type: 'FILL_IN_BLANK',
            imageUrl: '',
            options: { A: '', B: '', C: '', D: '' },
            answer: ''
          };
          updated[key] = {
            ...cur,
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

      if (selectedTest.pdfUrl) {
        setPdfUrl(selectedTest.pdfUrl);
      }
      if (selectedTest.audioUrl) {
        setAudioUrl(selectedTest.audioUrl);
      }

      const targetSkill = selectedTest.type === 'LISTENING' ? 'LISTENING' : 'READING';
      if (skillType === 'BOTH') {
        setActiveTab(targetSkill);
      }

      const answersRes: any = await mockTestService.getAnswers(Number(selectedMockTestId));
      const answersList = Array.isArray(answersRes) ? answersRes : answersRes?.data || [];

      const updated = { ...questions };
      answersList.forEach((q: any) => {
        const num = q.questionNumber || q.question_number;
        const text = q.questionText || q.question_text || '';
        const ans = q.correctAnswer || q.correct_answer || '';
        if (num >= 1 && num <= 40) {
          const key = `${targetSkill}_${num}`;
          const cur = updated[key] || {
            prompt: '',
            type: 'FILL_IN_BLANK',
            imageUrl: '',
            options: { A: '', B: '', C: '', D: '' },
            answer: ''
          };
          updated[key] = {
            ...cur,
            prompt: text || cur.prompt,
            answer: ans || cur.answer
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
          const serializedQText = serializeQuestionData({
            prompt: val.prompt,
            type: val.type,
            imageUrl: val.imageUrl,
            options: val.type === 'MULTIPLE_CHOICE' ? val.options : undefined
          });

          questionList.push({
            skill: s,
            questionNumber: Number(numStr),
            questionText: serializedQText,
            correctAnswer: val.answer.trim()
          });
        }
      });

      const serializedPassages = serializePassageData(passages);

      const payload: EventExamConfig = {
        examFormat,
        skillType,
        durationMinutes,
        pdfUrl,
        audioUrl,
        passageText: serializedPassages,
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

  // Danh sách các số câu hỏi được lọc theo Passage
  const filteredQuestionNumbers = Array.from({ length: 40 }, (_, idx) => idx + 1).filter((num) => {
    if (questionFilter === 'P1') return num >= 1 && num <= 13;
    if (questionFilter === 'P2') return num >= 14 && num <= 26;
    if (questionFilter === 'P3') return num >= 27 && num <= 40;
    return true;
  });

  const activePassage = passages.find((p) => p.id === editingPassageTab) || {
    id: editingPassageTab,
    title: `Part / Passage ${editingPassageTab}`,
    instruction: '',
    imageUrl: '',
    content: ''
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 font-sans animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 md:px-7 md:py-4 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h3 className="text-sm font-black text-slate-900">Cấu Hình Đề Thi Thử (Event Exam)</h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {event.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Thiết lập 3 Passages bài đọc, link Audio (Listening), hình ảnh bản đồ/sơ đồ và 40 câu hỏi chi tiết
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-bold">Đang tải cấu hình đề thi...</div>
          ) : (
            <>
              {/* PHẦN 1: THIẾT LẬP CHUNG */}
              <div className="bg-slate-50/70 p-4 md:p-5 rounded-2xl border border-slate-200/80 space-y-4">
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
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600 font-bold"
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
                      <option value="READING">📖 READING (3 Passages - 40 Câu)</option>
                      <option value="LISTENING">🎧 LISTENING (Audio - 40 Câu)</option>
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

              {/* PHẦN 2: TÀI LIỆU ĐỀ THI & 3 PASSAGES */}
              <div className="bg-slate-50/70 p-4 md:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  2. Tài liệu đề thi, Audio & Soạn 3 Passages Bài Đọc
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">
                      📄 Link File PDF Đề Thi (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/ielts-reading-test.pdf"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Học viên có thể chuyển đổi giữa xem văn bản bài đọc và xem trực tiếp PDF.</p>
                  </div>

                  {(skillType === 'LISTENING' || skillType === 'BOTH') && (
                    <div>
                      <label className="block mb-1 text-xs font-bold text-emerald-800">
                        🎧 Link File Audio (.mp3) phần Listening:
                      </label>
                      <input
                        type="text"
                        placeholder="https://res.cloudinary.com/.../audio.mp3 hoặc link Google Drive"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        className="w-full p-2.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium outline-none focus:border-emerald-600"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Trình phát audio sẽ tự động phát trực tiếp trong phòng thi của học viên.</p>
                    </div>
                  )}
                </div>

                {/* KHU VỰC NHẬP PASSAGES / NỘI DUNG ĐỀ THI & BẢN ĐỒ */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>📚</span>
                      <span>
                        {skillType === 'LISTENING'
                          ? 'Soạn thảo Nội dung Đề Nghe (Part 1 - 4 hoặc Form / Map / Diagram):'
                          : 'Soạn thảo 3 Passages Bài Đọc (Kèm ảnh Map / Diagram nếu có):'}
                      </span>
                    </span>

                    {/* Tab chọn Passage / Part để soạn */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
                      {(skillType === 'LISTENING' ? [1, 2, 3, 4] : [1, 2, 3]).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setEditingPassageTab(num)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            editingPassageTab === num
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {skillType === 'LISTENING' ? `Part ${num}` : `Passage ${num}`}{' '}
                          {skillType === 'LISTENING'
                            ? `(Q${(num - 1) * 10 + 1}-${num * 10})`
                            : num === 1
                            ? '(Q1-13)'
                            : num === 2
                            ? '(Q14-26)'
                            : '(Q27-40)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form chi tiết cho Passage / Part đang chọn */}
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-[11px] font-bold text-slate-600">
                          Tiêu đề {skillType === 'LISTENING' ? `Part ${editingPassageTab}` : `Passage ${editingPassageTab}`}:
                        </label>
                        <input
                          type="text"
                          placeholder={skillType === 'LISTENING' ? "VD: Customer Enquiry Form, Campus Map, Seminar Discussion..." : "VD: Bovids, Roman Shipwrecks, Climate Change..."}
                          value={activePassage.title}
                          onChange={(e) => handlePassageChange(editingPassageTab, 'title', e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 text-[11px] font-bold text-slate-600">
                          Hướng dẫn làm bài (Instruction):
                        </label>
                        <input
                          type="text"
                          placeholder={skillType === 'LISTENING' ? "VD: Questions 1-10: Complete the notes below..." : "VD: You should spend about 20 minutes on Questions 1-13..."}
                          value={activePassage.instruction || ''}
                          onChange={(e) => handlePassageChange(editingPassageTab, 'instruction', e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Đính kèm hình ảnh Map / Diagram cho Passage */}
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <span>🗺️</span>
                          <span>Link Hình ảnh Bản đồ / Sơ đồ (Tùy chọn cho bài dạng Map / Diagram / Labelling):</span>
                        </label>
                        {activePassage.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(activePassage.imageUrl || null)}
                            className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            🔍 Xem ảnh đầy đủ
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="https://res.cloudinary.com/.../passage_map.png hoặc link hình ảnh trực tiếp"
                          value={activePassage.imageUrl || ''}
                          onChange={(e) => handlePassageChange(editingPassageTab, 'imageUrl', e.target.value)}
                          className="flex-1 p-2 bg-white border border-blue-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                        />
                      </div>
                      {activePassage.imageUrl && (
                        <div className="pt-1 flex items-center gap-3">
                          <img
                            src={activePassage.imageUrl}
                            alt="Passage Preview"
                            className="h-16 w-28 object-cover rounded-lg border border-blue-200 cursor-pointer"
                            onClick={() => setPreviewImageUrl(activePassage.imageUrl || null)}
                          />
                          <span className="text-[10px] text-slate-500">
                            Hình ảnh này sẽ được hiển thị ngay bên trên hoặc bên cạnh văn bản bài đọc/nghe, học viên có thể phóng to khi làm bài.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Văn bản nội dung bài đọc */}
                    <div>
                      <label className="block mb-1 text-[11px] font-bold text-slate-700">
                        Nội dung văn bản / Biểu mẫu {skillType === 'LISTENING' ? `Part ${editingPassageTab}` : `Passage ${editingPassageTab}`} (Hỗ trợ học viên bôi đen để Highlight trực tiếp):
                      </label>
                      <textarea
                        rows={7}
                        placeholder={skillType === 'LISTENING' ? `Dán thông tin, biểu mẫu hoặc văn bản ngữ cảnh Part ${editingPassageTab} vào đây...` : `Dán nội dung bài đọc Passage ${editingPassageTab} vào đây...`}
                        value={activePassage.content}
                        onChange={(e) => handlePassageChange(editingPassageTab, 'content', e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-serif leading-relaxed outline-none focus:bg-white focus:border-blue-600 custom-scrollbar"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 3: BẢNG KHAI BÁO 40 CÂU HỎI VÀ DẠNG CÂU HỎI */}
              <div className="bg-slate-50/70 p-4 md:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      3. Khai báo 40 Câu Hỏi & Dạng Bài Thi
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Hỗ trợ chọn dạng Multiple Choice (A/B/C/D xuống dòng), Điền từ, True/False/Not Given và chèn ảnh Map theo câu
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
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

                {/* Sub-tabs phân nhóm 40 câu hỏi theo Passage để soạn dễ dàng */}
                <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
                  <span className="text-[11px] font-bold text-slate-500 px-2">Xem câu:</span>
                  {[
                    { key: 'ALL', label: 'Tất cả 40 câu' },
                    { key: 'P1', label: 'Passage 1 (Câu 1-13)' },
                    { key: 'P2', label: 'Passage 2 (Câu 14-26)' },
                    { key: 'P3', label: 'Passage 3 (Câu 27-40)' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setQuestionFilter(tab.key as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        questionFilter === tab.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
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

                {/* DANH SÁCH CÁC CÂU HỎI CHI TIẾT */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredQuestionNumbers.map((num) => {
                    const key = `${activeTab}_${num}`;
                    const cur = questions[key] || {
                      prompt: '',
                      type: 'FILL_IN_BLANK',
                      imageUrl: '',
                      options: { A: '', B: '', C: '', D: '' },
                      answer: ''
                    };

                    return (
                      <div
                        key={key}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 transition-all focus-within:border-blue-500"
                      >
                        {/* Hàng 1: Số câu, Dạng câu hỏi & Trạng thái */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">
                              {num}
                            </span>
                            <span className="text-xs font-black text-slate-800">Câu {num}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                cur.answer ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {cur.answer ? `Đ/A: ${cur.answer}` : 'Chưa có đáp án'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-500">Dạng câu hỏi:</label>
                            <select
                              value={cur.type}
                              onChange={(e) =>
                                handleQuestionFieldChange(activeTab, num, 'type', e.target.value as ExamQuestionType)
                              }
                              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 outline-none focus:bg-white focus:border-blue-600"
                            >
                              <option value="FILL_IN_BLANK">📝 Điền từ / Tự luận ngắn</option>
                              <option value="MULTIPLE_CHOICE">🔘 Trắc nghiệm (A, B, C, D)</option>
                              <option value="TFNG">⚖️ True / False / Not Given</option>
                            </select>
                          </div>
                        </div>

                        {/* Hàng 2: Nội dung câu hỏi (Prompt) & Link ảnh Map/Diagram (nếu có) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder={`Nội dung câu hỏi ${num} (VD: What is the smallest species of Bovid called?)...`}
                              value={cur.prompt}
                              onChange={(e) => handleQuestionFieldChange(activeTab, num, 'prompt', e.target.value)}
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="🖼️ Link ảnh Map/Diagram (nếu có)..."
                              value={cur.imageUrl || ''}
                              onChange={(e) => handleQuestionFieldChange(activeTab, num, 'imageUrl', e.target.value)}
                              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
                            />
                          </div>
                        </div>

                        {/* Thumbnail xem trước ảnh câu hỏi nếu có */}
                        {cur.imageUrl && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <img
                              src={cur.imageUrl}
                              alt={`Minh họa câu ${num}`}
                              className="h-12 w-20 object-cover rounded-lg border border-slate-200 cursor-pointer"
                              onClick={() => setPreviewImageUrl(cur.imageUrl || null)}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(cur.imageUrl || null)}
                              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              🔍 Xem ảnh minh họa câu {num}
                            </button>
                          </div>
                        )}

                        {/* Hàng 3: Nhập đáp án theo từng dạng */}
                        {cur.type === 'MULTIPLE_CHOICE' ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">
                                Nhập 4 lựa chọn A, B, C, D (hiển thị xuống dòng độc lập):
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500">Chọn đáp án đúng:</span>
                                {['A', 'B', 'C', 'D'].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleQuestionFieldChange(activeTab, num, 'answer', opt)}
                                    className={`w-6 h-6 rounded-md text-xs font-black transition-all cursor-pointer ${
                                      (cur.answer || '').toUpperCase() === opt
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                                <div key={optKey} className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                    (cur.answer || '').toUpperCase() === optKey
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {optKey}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Nội dung đáp án ${optKey}...`}
                                    value={cur.options[optKey]}
                                    onChange={(e) => handleOptionChange(activeTab, num, optKey, e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-600"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : cur.type === 'TFNG' ? (
                          <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-600 mr-2">Đáp án chuẩn:</span>
                            {['TRUE', 'FALSE', 'NOT GIVEN'].map((choice) => (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => handleQuestionFieldChange(activeTab, num, 'answer', choice)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  (cur.answer || '').toUpperCase() === choice
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              placeholder="Đáp án đúng (hỗ trợ nhiều đáp án cách nhau bằng gạch chéo: centre/center)..."
                              value={cur.answer}
                              onChange={(e) => handleQuestionFieldChange(activeTab, num, 'answer', e.target.value)}
                              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
                            />
                          </div>
                        )}
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

      {/* Lightbox Preview Modal cho ảnh Map / Diagram */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white font-black text-sm bg-white/20 hover:bg-white/40 px-3 py-1 rounded-full cursor-pointer"
            >
              ✕ Đóng
            </button>
            <img
              src={previewImageUrl}
              alt="Map Preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
