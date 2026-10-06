import React, { useState, useEffect } from 'react';
import {
  bookingService,
  type SupportBooking,
  type TestEvent,
  type TestEventRegistration
} from '../../services/bookingService';

export default function BookingManagement() {
  const [activeSection, setActiveSection] = useState<'support' | 'events'>('support');
  const [adminBookings, setAdminBookings] = useState<SupportBooking[]>([]);
  const [adminEvents, setAdminEvents] = useState<TestEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Admin Đánh giá/Chấm điểm ca hỗ trợ 30p
  const [evaluatingBooking, setEvaluatingBooking] = useState<SupportBooking | null>(null);
  const [evalScore, setEvalScore] = useState<string>('');
  const [evalComment, setEvalComment] = useState<string>('');
  const [evalTaName, setEvalTaName] = useState<string>('');
  const [evalPresent, setEvalPresent] = useState<boolean>(true);

  // Modal Admin Tạo Event mới
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDeadline, setNewEventDeadline] = useState('');
  const [shiftsInput, setShiftsInput] = useState([
    { shiftName: 'Ca Sáng', startTime: '08:30', endTime: '11:30', maxCapacity: 20 },
    { shiftName: 'Ca Chiều', startTime: '14:00', endTime: '17:00', maxCapacity: 20 }
  ]);

  // Modal xem danh sách thí sinh ca thi
  const [selectedShiftForStudents, setSelectedShiftForStudents] = useState<any | null>(null);
  const [shiftStudents, setShiftStudents] = useState<TestEventRegistration[]>([]);
  const [loadingShiftStudents, setLoadingShiftStudents] = useState(false);
  const [scoringReg, setScoringReg] = useState<TestEventRegistration | null>(null);
  const [scoreL, setScoreL] = useState('');
  const [scoreR, setScoreR] = useState('');
  const [scoreW, setScoreW] = useState('');
  const [scoreS, setScoreS] = useState('');
  const [scoreOverall, setScoreOverall] = useState('');
  const [scoreFeedback, setScoreFeedback] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [bData, eData] = await Promise.all([
        bookingService.getAllSupportBookingsAdmin(),
        bookingService.getAllEventsAdmin()
      ]);
      setAdminBookings(Array.isArray(bData) ? bData : []);
      setAdminEvents(Array.isArray(eData) ? eData : []);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu admin:', err);
      setAdminBookings([]);
      setAdminEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // --- ACTIONS CHẤM ĐIỂM CA HỖ TRỢ ---
  const handleOpenEvaluate = (b: SupportBooking) => {
    setEvaluatingBooking(b);
    setEvalScore(b.score !== null && b.score !== undefined ? String(b.score) : '');
    setEvalComment(b.taComment || '');
    setEvalTaName(b.assignedTaName || '');
    setEvalPresent(b.isPresent !== false);
  };

  const handleSaveEvaluate = async () => {
    if (!evaluatingBooking) return;
    try {
      await bookingService.evaluateSupportBookingAdmin(evaluatingBooking.id, {
        isPresent: evalPresent,
        score: evalScore ? parseFloat(evalScore) : undefined,
        taComment: evalComment,
        assignedTaName: evalTaName
      });
      showToast('Đã lưu kết quả điểm danh & nhận xét cho học viên!', 'success');
      setEvaluatingBooking(null);
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể lưu đánh giá. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };

  // --- ACTIONS TẠO KỲ THI THỬ MỚI ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookingService.createEventAdmin({
        title: newEventTitle,
        description: newEventDesc,
        eventDate: newEventDate,
        location: newEventLocation,
        registrationDeadline: newEventDeadline ? newEventDeadline + ':00' : undefined,
        shifts: shiftsInput
      });
      showToast('Tạo kỳ thi thử mới thành công!', 'success');
      setShowCreateEventModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventDeadline('');
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể tạo kỳ thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };

  // --- ACTIONS XEM THÍ SINH & CHẤM ĐIỂM THI THỬ ---
  const handleViewShiftStudents = async (shift: any) => {
    setSelectedShiftForStudents(shift);
    setLoadingShiftStudents(true);
    try {
      const data = await bookingService.getShiftStudentsAdmin(shift.id);
      setShiftStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách thí sinh:', err);
      setShiftStudents([]);
    } finally {
      setLoadingShiftStudents(false);
    }
  };

  const handleOpenScoreStudent = (st: TestEventRegistration) => {
    setScoringReg(st);
    setScoreL(st.scoreListening !== null && st.scoreListening !== undefined ? String(st.scoreListening) : '');
    setScoreR(st.scoreReading !== null && st.scoreReading !== undefined ? String(st.scoreReading) : '');
    setScoreW(st.scoreWriting !== null && st.scoreWriting !== undefined ? String(st.scoreWriting) : '');
    setScoreS(st.scoreSpeaking !== null && st.scoreSpeaking !== undefined ? String(st.scoreSpeaking) : '');
    setScoreOverall(st.overallScore !== null && st.overallScore !== undefined ? String(st.overallScore) : '');
    setScoreFeedback(st.feedback || '');
  };

  const handleSaveStudentScore = async () => {
    if (!scoringReg) return;
    try {
      await bookingService.updateStudentScoreAdmin(scoringReg.id, {
        scoreListening: scoreL ? parseFloat(scoreL) : undefined,
        scoreReading: scoreR ? parseFloat(scoreR) : undefined,
        scoreWriting: scoreW ? parseFloat(scoreW) : undefined,
        scoreSpeaking: scoreS ? parseFloat(scoreS) : undefined,
        overallScore: scoreOverall ? parseFloat(scoreOverall) : undefined,
        feedback: scoreFeedback
      });
      showToast('Đã lưu bảng điểm và nhận xét cho thí sinh!', 'success');
      setScoringReg(null);
      if (selectedShiftForStudents) {
        handleViewShiftStudents(selectedShiftForStudents);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể lưu điểm thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 transition-all animate-slideUp ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Điều Khiển Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>📅</span> Quản Lý Đặt Lịch & Thi Thử IELTS
          </h3>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Duyệt ca hỗ trợ 30p, gán trợ giảng, tạo đợt thi thử và chấm điểm thí sinh
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveSection('support')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'support' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💬 Ca Hỗ Trợ 1-1 ({adminBookings.length})
            </button>
            <button
              onClick={() => setActiveSection('events')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'events' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏆 Kỳ Thi Thử ({adminEvents.length})
            </button>
          </div>

          {activeSection === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>➕</span> Tạo Kỳ Thi Mới
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: QUẢN LÝ CA HỖ TRỢ 30 PHÚT */}
      {activeSection === 'support' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>💬</span> Danh Sách Tất Cả Ca Hỗ Trợ 30 Phút ({adminBookings.length})
            </h4>
            <button
              onClick={fetchAdminData}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>🔄</span> Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b">
                <tr>
                  <th className="p-3">Học viên</th>
                  <th className="p-3">Ngày & Giờ</th>
                  <th className="p-3">Kỹ năng</th>
                  <th className="p-3">Ghi chú học viên</th>
                  <th className="p-3">Trợ giảng</th>
                  <th className="p-3">Điểm / Nhận xét</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 font-semibold">
                    <td className="p-3 font-black text-slate-900">
                      <div>{b.user?.fullName || b.user?.username || 'Học viên'}</div>
                      <div className="text-[10px] font-medium text-slate-400">{b.user?.username || ''}</div>
                    </td>
                    <td className="p-3">
                      <div>{b.bookingDate}</div>
                      <div className="text-[10px] text-blue-600 font-bold">{b.startTime} - {b.endTime}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                        {b.skill}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate" title={b.studentNote || ''}>
                      {b.studentNote || <span className="text-slate-300 italic">Không có ghi chú</span>}
                    </td>
                    <td className="p-3 text-slate-600 font-bold">{b.assignedTaName || 'Chưa gán'}</td>
                    <td className="p-3">
                      {b.score !== null && b.score !== undefined ? (
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          ⭐ {b.score}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Chưa chấm</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          b.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-700'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenEvaluate(b)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        Chấm điểm & Nhận xét
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: QUẢN LÝ CÁC KỲ THI THỬ & CA THI */}
      {activeSection === 'events' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>🏆</span> Các Đợt Thi Thử Đang Mở ({adminEvents.length})
            </h4>
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              + Tạo thêm kỳ thi mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminEvents.map((ev) => (
              <div key={ev.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-900 text-sm">{ev.title}</h5>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-slate-600 border">
                    {ev.eventDate}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{ev.location}</p>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-black uppercase text-slate-400">Danh sách các ca thi:</p>
                  {ev.shifts &&
                    ev.shifts.map((sh) => (
                      <div
                        key={sh.id}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{sh.shiftName}</span>
                          <span className="text-slate-400 text-[10px] ml-2">
                            ({sh.startTime} - {sh.endTime})
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewShiftStudents(sh)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Xem thí sinh ({sh.currentRegistered}/{sh.maxCapacity}) →
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CHẤM ĐIỂM & ĐÁNH GIÁ CA HỖ TRỢ */}
      {evaluatingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <h3 className="text-base font-black text-slate-900">
              📝 Đánh Giá Ca Hỗ Trợ #{evaluatingBooking.id}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="font-bold text-slate-700">Điểm danh:</label>
                <button
                  type="button"
                  onClick={() => setEvalPresent(!evalPresent)}
                  className={`px-3 py-1 rounded-lg font-black cursor-pointer ${
                    evalPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {evalPresent ? '✓ Có mặt' : '✕ Vắng mặt'}
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Trợ giảng phụ trách:</label>
                <input
                  type="text"
                  value={evalTaName}
                  onChange={(e) => setEvalTaName(e.target.value)}
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Điểm đánh giá (thang 9.0):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9.0"
                  value={evalScore}
                  onChange={(e) => setEvalScore(e.target.value)}
                  placeholder="Ví dụ: 7.0"
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lời dặn / Nhận xét của Trợ giảng:</label>
                <textarea
                  value={evalComment}
                  onChange={(e) => setEvalComment(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú nhận xét điểm mạnh và điểm cần cải thiện của học viên..."
                  className="w-full border rounded-xl p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEvaluatingBooking(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEvaluate}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer shadow-sm hover:bg-blue-700"
              >
                Lưu Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO SỰ KIỆN THI MỚI */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEvent}
            className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-black text-slate-900">➕ Tạo Kỳ Thi Thử Mới</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên kỳ thi: *</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Ví dụ: IELTS Mock Test Tháng 10"
                  className="w-full border rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả kỳ thi:</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  rows={2}
                  className="w-full border rounded-xl p-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày thi: *</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full border rounded-xl p-2 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Địa điểm: *</label>
                  <input
                    type="text"
                    required
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="Phòng Lab 2"
                    className="w-full border rounded-xl p-2 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hạn chót đăng ký:</label>
                <input
                  type="datetime-local"
                  value={newEventDeadline}
                  onChange={(e) => setNewEventDeadline(e.target.value)}
                  className="w-full border rounded-xl p-2 font-bold outline-none"
                />
              </div>

              <div className="pt-2 border-t">
                <p className="font-black text-slate-900 mb-2">Các ca thi (Shifts):</p>
                <div className="space-y-2">
                  {shiftsInput.map((sh, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                      <input
                        type="text"
                        value={sh.shiftName}
                        onChange={(e) => {
                          const updated = [...shiftsInput];
                          updated[idx].shiftName = e.target.value;
                          setShiftsInput(updated);
                        }}
                        placeholder="Tên ca"
                        className="w-24 border rounded p-1 text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={sh.startTime}
                        onChange={(e) => {
                          const updated = [...shiftsInput];
                          updated[idx].startTime = e.target.value;
                          setShiftsInput(updated);
                        }}
                        placeholder="08:30"
                        className="w-16 border rounded p-1 text-xs"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={sh.endTime}
                        onChange={(e) => {
                          const updated = [...shiftsInput];
                          updated[idx].endTime = e.target.value;
                          setShiftsInput(updated);
                        }}
                        placeholder="11:30"
                        className="w-16 border rounded p-1 text-xs"
                      />
                      <input
                        type="number"
                        value={sh.maxCapacity}
                        onChange={(e) => {
                          const updated = [...shiftsInput];
                          updated[idx].maxCapacity = parseInt(e.target.value) || 20;
                          setShiftsInput(updated);
                        }}
                        placeholder="Sĩ số"
                        className="w-16 border rounded p-1 text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-black text-xs cursor-pointer shadow-sm hover:bg-blue-700"
              >
                Tạo Kỳ Thi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: XEM DANH SÁCH THÍ SINH & NHẬP ĐIỂM THI */}
      {selectedShiftForStudents && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  👥 Danh Sách Thí Sinh: {selectedShiftForStudents.shiftName}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Thời gian: {selectedShiftForStudents.startTime} - {selectedShiftForStudents.endTime} | Sĩ số: {shiftStudents.length}/{selectedShiftForStudents.maxCapacity}
                </p>
              </div>
              <button
                onClick={() => setSelectedShiftForStudents(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingShiftStudents ? (
              <p className="text-xs font-bold text-center py-8 text-slate-400">Đang tải thí sinh...</p>
            ) : shiftStudents.length === 0 ? (
              <p className="text-xs font-bold text-center py-8 text-slate-400">Chưa có thí sinh nào đăng ký ca này.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-[10px] font-black text-slate-400 border-b">
                    <tr>
                      <th className="p-2.5">Thí sinh</th>
                      <th className="p-2.5">SĐT</th>
                      <th className="p-2.5">Trạng thái</th>
                      <th className="p-2.5">Overall</th>
                      <th className="p-2.5 text-right">Nhập điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shiftStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 font-semibold">
                        <td className="p-2.5 font-black text-slate-900">{st.fullName}</td>
                        <td className="p-2.5 text-slate-500">{st.phone || '-'}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              st.status === 'ATTENDED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-black text-blue-600">
                          {st.overallScore !== null && st.overallScore !== undefined ? `⭐ ${st.overallScore}` : '-'}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleOpenScoreStudent(st)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer"
                          >
                            Chấm điểm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: CHẤM ĐIỂM 4 KỸ NĂNG CHO THÍ SINH */}
      {scoringReg && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <h3 className="text-base font-black text-slate-900">
              📊 Chấm Điểm Thí Sinh: {scoringReg.fullName}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Listening:</label>
                <input
                  type="number"
                  step="0.5"
                  value={scoreL}
                  onChange={(e) => setScoreL(e.target.value)}
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reading:</label>
                <input
                  type="number"
                  step="0.5"
                  value={scoreR}
                  onChange={(e) => setScoreR(e.target.value)}
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Writing:</label>
                <input
                  type="number"
                  step="0.5"
                  value={scoreW}
                  onChange={(e) => setScoreW(e.target.value)}
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Speaking:</label>
                <input
                  type="number"
                  step="0.5"
                  value={scoreS}
                  onChange={(e) => setScoreS(e.target.value)}
                  className="w-full border rounded-xl p-2 outline-none font-bold"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-black text-blue-900 block mb-1">Overall Band Score: *</label>
              <input
                type="number"
                step="0.5"
                value={scoreOverall}
                onChange={(e) => setScoreOverall(e.target.value)}
                placeholder="Ví dụ: 7.0"
                className="w-full border-2 border-blue-600 rounded-xl p-2 font-black text-blue-700 outline-none text-sm"
              />
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">Lời nhận xét / Phản hồi:</label>
              <textarea
                value={scoreFeedback}
                onChange={(e) => setScoreFeedback(e.target.value)}
                rows={2}
                className="w-full border rounded-xl p-2 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScoringReg(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveStudentScore}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer hover:bg-indigo-700"
              >
                Lưu Điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
