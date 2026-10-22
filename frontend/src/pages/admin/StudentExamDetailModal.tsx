import React, { useState, useEffect } from 'react';
import { bookingService, type ExamSubmissionResult } from '../../services/bookingService';

interface StudentExamDetailModalProps {
  registrationId: number;
  onClose: () => void;
}

export default function StudentExamDetailModal({
  registrationId,
  onClose
}: StudentExamDetailModalProps) {
  const [detail, setDetail] = useState<ExamSubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await bookingService.getRegistrationExamDetailAdmin(registrationId);
        setDetail(data);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết bài làm:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [registrationId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 font-sans animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 md:px-7 md:py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📝</span>
              <span>Chi Tiết Bài Làm Thí Sinh</span>
            </h3>
            {detail && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Học viên: <strong className="text-slate-800">{detail.studentName}</strong> • {detail.eventTitle} ({detail.shiftName})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-bold">Đang tải bài thi...</div>
          ) : !detail ? (
            <div className="py-12 text-center text-slate-400 text-xs">Không tìm thấy dữ liệu bài thi.</div>
          ) : (
            <>
              {/* Score Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {detail.scoreListening !== null && detail.scoreListening !== undefined && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Listening Band</span>
                    <span className="text-3xl font-black text-emerald-600 block my-0.5">{detail.scoreListening.toFixed(1)}</span>
                    <span className="text-[10px] text-emerald-800 font-semibold">
                      Đúng {detail.listeningCorrectCount || 0} / 40 câu
                    </span>
                  </div>
                )}

                {detail.scoreReading !== null && detail.scoreReading !== undefined && (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                    <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Reading Band</span>
                    <span className="text-3xl font-black text-blue-600 block my-0.5">{detail.scoreReading.toFixed(1)}</span>
                    <span className="text-[10px] text-blue-800 font-semibold">
                      Đúng {detail.readingCorrectCount || 0} / 40 câu
                    </span>
                  </div>
                )}

                {detail.overallScore !== null && detail.overallScore !== undefined && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-white">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Overall Band</span>
                    <span className="text-3xl font-black text-white block my-0.5">{detail.overallScore.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Quy đổi chuẩn</span>
                  </div>
                )}
              </div>

              {/* Danh sách 40 câu đối chiếu */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Đối chiếu chi tiết từng câu hỏi:
                </span>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {detail.reviewDetails && detail.reviewDetails.length > 0 ? (
                    detail.reviewDetails.map((q) => (
                      <div
                        key={`${q.skill}_${q.questionNumber}`}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          q.isCorrect ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] text-white shrink-0 ${
                              q.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          >
                            {q.questionNumber}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {q.skill} - Câu {q.questionNumber}
                            </span>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                              <span>
                                Trả lời:{' '}
                                <strong className={q.isCorrect ? 'text-emerald-700' : 'text-rose-700 font-mono'}>
                                  {q.studentAnswer || '(Bỏ trống)'}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Đáp án đúng: <strong className="text-slate-800 font-mono">{q.correctAnswer}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            q.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.isCorrect ? '✓ ĐÚNG' : '✗ SAI'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      Học viên chưa nộp bài hoặc chưa có câu hỏi nào được lưu.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
