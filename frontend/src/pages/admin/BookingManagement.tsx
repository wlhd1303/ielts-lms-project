import React, { useState, useEffect } from 'react';
import {
  bookingService,
  type SupportBooking,
  type TestEvent,
  type TestEventRegistration
} from '../../services/bookingService';
import EventExamConfigModal from './EventExamConfigModal';
import StudentExamDetailModal from './StudentExamDetailModal';

export default function BookingManagement() {
  const [activeSection, setActiveSection] = useState<'support' | 'events' | 'online_exam'>('support');
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
  const [newEventExamFormat, setNewEventExamFormat] = useState<'OFFLINE' | 'ONLINE'>('ONLINE');
  const [newEventSkillType, setNewEventSkillType] = useState<'LISTENING' | 'READING' | 'BOTH'>('READING');
  const [newEventDuration, setNewEventDuration] = useState<number>(60);
  const [shiftsInput, setShiftsInput] = useState([
    { shiftName: 'Ca Sáng', startTime: '08:30', endTime: '11:30', maxCapacity: 20 },
    { shiftName: 'Ca Chiều', startTime: '14:00', endTime: '17:00', maxCapacity: 20 }
  ]);

  // Modal Admin Chỉnh sửa Event
  const [editingEvent, setEditingEvent] = useState<TestEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState<'OPEN' | 'CLOSED' | 'COMPLETED'>('OPEN');
  const [editExamFormat, setEditExamFormat] = useState<'OFFLINE' | 'ONLINE'>('ONLINE');
  const [editSkillType, setEditSkillType] = useState<'LISTENING' | 'READING' | 'BOTH'>('READING');
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editShifts, setEditShifts] = useState<any[]>([]);
  const [submittingEditEvent, setSubmittingEditEvent] = useState(false);

  // State Quản lý Đề Thi & Bảng Điểm Online
  const [configExamEvent, setConfigExamEvent] = useState<TestEvent | null>(null);
  const [selectedExamEventId, setSelectedExamEventId] = useState<number | ''>('');
  const [viewingRegistrationId, setViewingRegistrationId] = useState<number | null>(null);
  const [onlineRegistrations, setOnlineRegistrations] = useState<TestEventRegistration[]>([]);
  const [loadingOnlineRegistrations, setLoadingOnlineRegistrations] = useState(false);

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

  // Helper mô tả giờ thân thiện (Sáng / Chiều / Tối) để tránh Admin nhầm lẫn 03:00 và 15:00
  const getTimeDescription = (timeStr: string) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return '';
    if (h >= 12 && h < 18) {
      return `${h > 12 ? h - 12 : 12}:${mStr} Chiều`;
    } else if (h >= 18) {
      return `${h - 12}:${mStr} Tối`;
    } else if (h === 0) {
      return `12:${mStr} Đêm`;
    } else if (h < 6) {
      return `${h}:${mStr} Sáng sớm`;
    } else {
      return `${h}:${mStr} Sáng`;
    }
  };

  const isEarlyMorning = (timeStr: string) => {
    if (!timeStr) return false;
    const h = parseInt(timeStr.split(':')[0], 10);
    return !isNaN(h) && h >= 1 && h <= 6;
  };

  const convertToPm = (timeStr: string) => {
    if (!timeStr) return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    if (!isNaN(h) && h < 12) {
      return `${String(h + 12).padStart(2, '0')}:${mStr}`;
    }
    return timeStr;
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

  const fetchOnlineRegistrations = async (eventId: number) => {
    setLoadingOnlineRegistrations(true);
    try {
      const data = await bookingService.getEventRegistrationsAdmin(eventId);
      setOnlineRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thí sinh thi online:', err);
      setOnlineRegistrations([]);
    } finally {
      setLoadingOnlineRegistrations(false);
    }
  };

  useEffect(() => {
    if (selectedExamEventId) {
      fetchOnlineRegistrations(Number(selectedExamEventId));
    } else {
      setOnlineRegistrations([]);
    }
  }, [selectedExamEventId]);

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
        examFormat: newEventExamFormat,
        skillType: newEventExamFormat === 'ONLINE' ? newEventSkillType : undefined,
        durationMinutes: newEventExamFormat === 'ONLINE' ? newEventDuration : undefined,
        shifts: shiftsInput
      });
      showToast('Tạo kỳ thi thử mới thành công!', 'success');
      setShowCreateEventModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventDeadline('');
      setNewEventExamFormat('ONLINE');
      setNewEventSkillType('READING');
      setNewEventDuration(60);
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

  // --- ACTIONS CHỈNH SỬA & XÓA KỲ THI THỬ ---
  const handleOpenEditEvent = (ev: TestEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditDesc(ev.description || '');
    setEditDate(ev.eventDate);
    setEditLocation(ev.location);
    setEditDeadline(ev.registrationDeadline ? ev.registrationDeadline.substring(0, 16) : '');
    setEditStatus((ev.status as any) || 'OPEN');
    setEditExamFormat(ev.examFormat || 'ONLINE');
    setEditSkillType(ev.skillType || 'READING');
    setEditDuration(ev.durationMinutes || 60);
    setEditShifts(
      ev.shifts && ev.shifts.length > 0
        ? ev.shifts.map((s) => ({
            id: s.id,
            shiftName: s.shiftName,
            startTime: s.startTime,
            endTime: s.endTime,
            maxCapacity: s.maxCapacity
          }))
        : [
            { shiftName: 'Ca Sáng', startTime: '08:30', endTime: '11:30', maxCapacity: 20 },
            { shiftName: 'Ca Chiều', startTime: '14:00', endTime: '17:00', maxCapacity: 20 }
          ]
    );
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSubmittingEditEvent(true);
    try {
      await bookingService.updateEventAdmin(editingEvent.id, {
        title: editTitle,
        description: editDesc,
        eventDate: editDate,
        location: editLocation,
        registrationDeadline: editDeadline ? editDeadline + ':00' : undefined,
        status: editStatus,
        examFormat: editExamFormat,
        skillType: editExamFormat === 'ONLINE' ? editSkillType : undefined,
        durationMinutes: editExamFormat === 'ONLINE' ? editDuration : undefined,
        shifts: editShifts
      });
      showToast('Cập nhật đợt thi thử thành công!', 'success');
      setEditingEvent(null);
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể cập nhật đợt thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    } finally {
      setSubmittingEditEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: number, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kỳ thi "${title}" không? Toàn bộ ca thi và danh sách thí sinh đăng ký sẽ bị xóa.`)) {
      return;
    }
    try {
      await bookingService.deleteEventAdmin(eventId);
      showToast('Đã xóa kỳ thi thử thành công!', 'success');
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể xóa kỳ thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };

  const handleAddEditShift = () => {
    setEditShifts((prev) => [
      ...prev,
      { shiftName: `Ca ${prev.length + 1}`, startTime: '08:30', endTime: '11:30', maxCapacity: 20 }
    ]);
  };

  const handleRemoveEditShift = (index: number) => {
    if (editShifts.length <= 1) {
      showToast('Phải có ít nhất 1 ca thi trong đợt thi!', 'error');
      return;
    }
    setEditShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEditShiftField = (index: number, field: string, value: any) => {
    setEditShifts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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

  const handleResetStudentRegistration = async (regId: number, fullName: string) => {
    if (!window.confirm(`Bạn có chắc muốn cho thí sinh "${fullName}" thi lại? Dữ liệu bài làm dở dang hoặc đã hết giờ của ca này sẽ được xóa để bạn ấy làm lại.`)) {
      return;
    }
    try {
      await bookingService.resetRegistrationAdmin(regId);
      showToast(`Đã reset thành công lượt thi cho "${fullName}"! Thí sinh có thể vào thi lại.`, 'success');
      if (selectedShiftForStudents) {
        handleViewShiftStudents(selectedShiftForStudents);
      }
      if (selectedExamEventId) {
        fetchOnlineRegistrations(Number(selectedExamEventId));
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể reset lượt thi.', 'error');
    }
  };

  const handleResetAllInShift = async (shiftId: number, shiftName: string) => {
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn RESET toàn bộ lượt thi cho tất cả thí sinh trong ca "${shiftName}"?\nTất cả thí sinh trong ca này sẽ được làm lại từ đầu.`)) {
      return;
    }
    try {
      await bookingService.resetAllShiftRegistrationsAdmin(shiftId);
      showToast(`Đã reset toàn bộ thí sinh trong ca "${shiftName}" thành công!`, 'success');
      if (selectedShiftForStudents) {
        handleViewShiftStudents(selectedShiftForStudents);
      }
      if (selectedExamEventId) {
        fetchOnlineRegistrations(Number(selectedExamEventId));
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể reset ca thi.', 'error');
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
            <button
              onClick={() => {
                setActiveSection('online_exam');
                if (!selectedExamEventId && adminEvents.length > 0) {
                  const onlineEv = adminEvents.find((e) => e.examFormat === 'ONLINE') || adminEvents[0];
                  setSelectedExamEventId(onlineEv.id);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'online_exam' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎯 Thi Online & Bảng Điểm
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-black text-slate-900 text-sm leading-snug">{ev.title}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-slate-700 border">
                        📅 {ev.eventDate}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        ev.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' :
                        ev.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {ev.status || 'OPEN'}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        ev.examFormat === 'ONLINE' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ev.examFormat === 'ONLINE' ? `💻 ONLINE (${ev.skillType || 'READING'})` : '🏛️ OFFLINE'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ev.examFormat === 'ONLINE' && (
                      <button
                        onClick={() => setConfigExamEvent(ev)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg transition-colors cursor-pointer"
                        title="Upload đề thi & bảng đáp án"
                      >
                        📝 Soạn Đề
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditEvent(ev)}
                      className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa thông tin kỳ thi"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.title)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors cursor-pointer"
                      title="Xóa kỳ thi này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
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

      {/* SECTION 3: QUẢN LÝ THI ONLINE & BẢNG ĐIỂM */}
      {activeSection === 'online_exam' && (
        <div className="space-y-6">
          {/* Thanh chọn đợt thi Online & Action Soạn đề */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bước 1: Chọn Kỳ Thi Online
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={selectedExamEventId}
                  onChange={(e) => setSelectedExamEventId(Number(e.target.value))}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 w-72"
                >
                  <option value="" disabled>-- Chọn Kỳ Thi Online --</option>
                  {adminEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.examFormat || 'OFFLINE'} - {ev.eventDate})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => selectedExamEventId && fetchOnlineRegistrations(Number(selectedExamEventId))}
                  className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Tải lại bảng điểm"
                >
                  🔄
                </button>
              </div>
            </div>

            {selectedExamEventId && (() => {
              const currentEv = adminEvents.find((e) => e.id === Number(selectedExamEventId));
              return (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {currentEv && (
                    <>
                      <button
                        onClick={() => handleOpenEditEvent(currentEv)}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        title="Đổi ngày thi, thời gian các ca thi hoặc thông tin kỳ thi"
                      >
                        <span>📅</span>
                        <span>Đổi Ngày & Giờ Thi</span>
                      </button>

                      <button
                        onClick={() => setConfigExamEvent(currentEv)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <span>📝</span>
                        <span>Soạn / Cấu Hình Đề Thi</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Chi tiết sự kiện & Bảng điểm thí sinh */}
          {selectedExamEventId ? (() => {
            const currentEv = adminEvents.find((e) => e.id === Number(selectedExamEventId));
            const submittedCount = onlineRegistrations.filter((r) => r.status === 'ATTENDED' || r.status === 'SUBMITTED' || r.examSubmittedAt).length;
            const inProgressCount = onlineRegistrations.filter((r) => r.status === 'IN_PROGRESS').length;
            const averageScore = submittedCount > 0
              ? (onlineRegistrations.reduce((acc, r) => acc + (r.overallScore || 0), 0) / submittedCount).toFixed(1)
              : '0.0';

            return (
              <div className="space-y-4">
                {/* Thống kê nhanh */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tổng thí sinh đăng ký</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{onlineRegistrations.length}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-amber-500">Đang làm bài</span>
                    <p className="text-2xl font-black text-amber-600 mt-1">{inProgressCount}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-500">Đã nộp bài</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{submittedCount}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-blue-500">Điểm trung bình (Overall)</span>
                    <p className="text-2xl font-black text-blue-600 mt-1">{averageScore}</p>
                  </div>
                </div>

                {/* Bảng danh sách thí sinh */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>🎓</span> Bảng Điểm Thí Sinh Thi Online ({onlineRegistrations.length})
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Theo dõi tiến độ, số câu đúng và Band Score quy đổi của từng học viên
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-b">
                        <tr>
                          <th className="p-3">Thí sinh</th>
                          <th className="p-3">Ca thi</th>
                          <th className="p-3">Trạng thái</th>
                          <th className="p-3 text-center">Listening Band</th>
                          <th className="p-3 text-center">Reading Band</th>
                          <th className="p-3 text-center">Overall</th>
                          <th className="p-3">Thời gian nộp</th>
                          <th className="p-3 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingOnlineRegistrations ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                              Đang tải dữ liệu thí sinh...
                            </td>
                          </tr>
                        ) : onlineRegistrations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                              Chưa có thí sinh nào đăng ký tham gia kỳ thi này.
                            </td>
                          </tr>
                        ) : (
                          onlineRegistrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3">
                                <span className="font-black text-slate-900 block">{reg.fullName}</span>
                                <span className="text-[11px] text-slate-400">{reg.email || reg.phone || '(Không có liên hệ)'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-700">{reg.shift?.shiftName}</span>
                                <span className="text-[10px] text-slate-400 block">
                                  {reg.shift?.startTime} - {reg.shift?.endTime}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                                    reg.status === 'ATTENDED' || reg.status === 'SUBMITTED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : reg.status === 'IN_PROGRESS'
                                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {reg.status === 'ATTENDED' || reg.status === 'SUBMITTED'
                                    ? '✓ ĐÃ NỘP BÀI'
                                    : reg.status === 'IN_PROGRESS'
                                    ? '⏳ ĐANG LÀM BÀI'
                                    : 'CHƯA VÀO'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {reg.scoreListening !== null && reg.scoreListening !== undefined ? (
                                  <div>
                                    <span className="font-black text-emerald-600 text-sm">{reg.scoreListening.toFixed(1)}</span>
                                    <span className="text-[9px] text-slate-400 block">({reg.listeningCorrectCount || 0}/40)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {reg.scoreReading !== null && reg.scoreReading !== undefined ? (
                                  <div>
                                    <span className="font-black text-blue-600 text-sm">{reg.scoreReading.toFixed(1)}</span>
                                    <span className="text-[9px] text-slate-400 block">({reg.readingCorrectCount || 0}/40)</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {reg.overallScore !== null && reg.overallScore !== undefined ? (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-xs">
                                    {reg.overallScore.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500 text-[11px] font-medium">
                                {reg.examSubmittedAt ? (
                                  new Date(reg.examSubmittedAt).toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit'
                                  })
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {reg.studentAnswers && (
                                    <button
                                      onClick={() => setViewingRegistrationId(reg.id)}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                                      title="Xem chi tiết 40 câu hỏi và câu trả lời của thí sinh"
                                    >
                                      👁️ Xem bài làm
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleResetStudentRegistration(reg.id, reg.fullName)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                                    title="Cho phép thí sinh làm lại bài thi từ đầu (xóa bài dở dang/hết giờ)"
                                  >
                                    🔄 Cho thi lại
                                  </button>
                                  <button
                                    onClick={() => handleOpenScoreStudent(reg)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                                    title="Sửa điểm hoặc thêm nhận xét"
                                  >
                                    ✏️ Chấm điểm
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="p-12 text-center text-slate-400 text-xs font-bold bg-white rounded-2xl border">
              Vui lòng chọn một kỳ thi Online để quản lý đề thi và xem bảng điểm.
            </div>
          )}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hình thức:</label>
                  <select
                    value={newEventExamFormat}
                    onChange={(e) => setNewEventExamFormat(e.target.value as any)}
                    className="w-full border rounded-lg p-1.5 bg-white font-bold"
                  >
                    <option value="ONLINE">💻 Online</option>
                    <option value="OFFLINE">🏛️ Offline</option>
                  </select>
                </div>
                {newEventExamFormat === 'ONLINE' && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kỹ năng:</label>
                      <select
                        value={newEventSkillType}
                        onChange={(e) => setNewEventSkillType(e.target.value as any)}
                        className="w-full border rounded-lg p-1.5 bg-white font-bold text-blue-700"
                      >
                        <option value="READING">📖 Reading</option>
                        <option value="LISTENING">🎧 Listening</option>
                        <option value="BOTH">🎯 Cả hai</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Thời lượng (p):</label>
                      <input
                        type="number"
                        min={10}
                        max={180}
                        value={newEventDuration}
                        onChange={(e) => setNewEventDuration(Number(e.target.value))}
                        className="w-full border rounded-lg p-1.5 bg-white font-mono font-bold"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900">⏰ Khung giờ các ca thi (Shifts):</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Học viên được mở đề trong vòng 1 tiếng kể từ Giờ bắt đầu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShiftsInput([...shiftsInput, { shiftName: `Ca ${shiftsInput.length + 1}`, startTime: '18:00', endTime: '20:00', maxCapacity: 20 }])}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    + Thêm ca
                  </button>
                </div>

                <div className="space-y-2">
                  {shiftsInput.map((sh, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          required
                          value={sh.shiftName}
                          onChange={(e) => {
                            const updated = [...shiftsInput];
                            updated[idx].shiftName = e.target.value;
                            setShiftsInput(updated);
                          }}
                          placeholder="Tên ca"
                          className="w-24 border rounded-lg p-1.5 text-xs font-bold bg-white"
                        />
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 flex-1">
                          <span className="text-[10px] text-slate-500 font-bold">Từ:</span>
                          <input
                            type="time"
                            required
                            value={sh.startTime}
                            onChange={(e) => {
                              const updated = [...shiftsInput];
                              updated[idx].startTime = e.target.value;
                              setShiftsInput(updated);
                            }}
                            className="border-none p-0 text-xs font-mono font-bold outline-none w-20 text-center"
                          />
                          <span className="text-slate-400">→</span>
                          <span className="text-[10px] text-slate-500 font-bold">Đến:</span>
                          <input
                            type="time"
                            required
                            value={sh.endTime}
                            onChange={(e) => {
                              const updated = [...shiftsInput];
                              updated[idx].endTime = e.target.value;
                              setShiftsInput(updated);
                            }}
                            className="border-none p-0 text-xs font-mono font-bold outline-none w-20 text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold">Max:</span>
                          <input
                            type="number"
                            required
                            min={1}
                            value={sh.maxCapacity}
                            onChange={(e) => {
                              const updated = [...shiftsInput];
                              updated[idx].maxCapacity = parseInt(e.target.value) || 20;
                              setShiftsInput(updated);
                            }}
                            placeholder="Sĩ số"
                            className="w-14 border rounded-lg p-1.5 text-xs font-bold bg-white text-center"
                          />
                        </div>
                        {shiftsInput.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShiftsInput(shiftsInput.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-sm font-bold cursor-pointer"
                            title="Xóa ca này"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                        <span>🕒 Khung giờ: <strong>{getTimeDescription(sh.startTime)}</strong> đến <strong>{getTimeDescription(sh.endTime)}</strong></span>
                      </div>
                      {isEarlyMorning(sh.startTime) && (
                        <div className="flex items-center justify-between text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                          <span>⚠️ Bạn đang chọn <strong>{sh.startTime} ({getTimeDescription(sh.startTime)})</strong>. Bạn có muốn đổi sang buổi chiều?</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...shiftsInput];
                              updated[idx].startTime = convertToPm(updated[idx].startTime);
                              updated[idx].endTime = convertToPm(updated[idx].endTime);
                              setShiftsInput(updated);
                            }}
                            className="ml-2 font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 cursor-pointer"
                          >
                            Đổi sang {convertToPm(sh.startTime)} chiều ➔
                          </button>
                        </div>
                      )}
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

      {/* MODAL 2B: CHỈNH SỬA KỲ THI THỬ & CA THI */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditEvent}
            className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">✏️ Chỉnh Sửa Kỳ Thi Thử</h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên kỳ thi: *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ví dụ: IELTS Mock Test Tháng 10"
                  className="w-full border rounded-xl p-2.5 font-bold outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả kỳ thi:</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full border rounded-xl p-2 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày thi: *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border rounded-xl p-2 font-bold outline-none focus:border-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Địa điểm: *</label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Phòng Lab 2"
                    className="w-full border rounded-xl p-2 font-bold outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hạn chót đăng ký:</label>
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full border rounded-xl p-2 font-bold outline-none focus:border-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trạng thái:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border rounded-xl p-2 font-bold outline-none focus:border-blue-600 bg-white cursor-pointer"
                  >
                    <option value="OPEN">🟢 Đang mở đăng ký (OPEN)</option>
                    <option value="CLOSED">🔒 Khóa đăng ký (CLOSED)</option>
                    <option value="COMPLETED">✅ Hoàn thành (COMPLETED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hình thức:</label>
                  <select
                    value={editExamFormat}
                    onChange={(e) => setEditExamFormat(e.target.value as any)}
                    className="w-full border rounded-lg p-1.5 bg-white font-bold"
                  >
                    <option value="ONLINE">💻 Online</option>
                    <option value="OFFLINE">🏛️ Offline</option>
                  </select>
                </div>
                {editExamFormat === 'ONLINE' && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kỹ năng:</label>
                      <select
                        value={editSkillType}
                        onChange={(e) => setEditSkillType(e.target.value as any)}
                        className="w-full border rounded-lg p-1.5 bg-white font-bold text-blue-700"
                      >
                        <option value="READING">📖 Reading</option>
                        <option value="LISTENING">🎧 Listening</option>
                        <option value="BOTH">🎯 Cả hai</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Thời lượng (p):</label>
                      <input
                        type="number"
                        min={10}
                        max={180}
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                        className="w-full border rounded-lg p-1.5 bg-white font-mono font-bold"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900">⏰ Khung giờ các ca thi (Shifts):</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Học viên được mở đề trong vòng 1 tiếng kể từ Giờ bắt đầu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditShift}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                  >
                    + Thêm ca thi
                  </button>
                </div>

                <div className="space-y-2">
                  {editShifts.map((sh, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          required
                          value={sh.shiftName}
                          onChange={(e) => handleUpdateEditShiftField(idx, 'shiftName', e.target.value)}
                          placeholder="Tên ca"
                          className="w-24 border rounded-lg p-1.5 text-xs font-bold bg-white"
                        />
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 flex-1">
                          <span className="text-[10px] text-slate-500 font-bold">Từ:</span>
                          <input
                            type="time"
                            required
                            value={sh.startTime}
                            onChange={(e) => handleUpdateEditShiftField(idx, 'startTime', e.target.value)}
                            className="border-none p-0 text-xs font-mono font-bold outline-none w-20 text-center"
                          />
                          <span className="text-slate-400">→</span>
                          <span className="text-[10px] text-slate-500 font-bold">Đến:</span>
                          <input
                            type="time"
                            required
                            value={sh.endTime}
                            onChange={(e) => handleUpdateEditShiftField(idx, 'endTime', e.target.value)}
                            className="border-none p-0 text-xs font-mono font-bold outline-none w-20 text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold">Max:</span>
                          <input
                            type="number"
                            required
                            min={1}
                            value={sh.maxCapacity}
                            onChange={(e) => handleUpdateEditShiftField(idx, 'maxCapacity', parseInt(e.target.value) || 1)}
                            className="w-14 border rounded-lg p-1.5 text-xs font-bold bg-white text-center"
                          />
                        </div>
                        {editShifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditShift(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 text-sm font-bold cursor-pointer"
                            title="Xóa ca này"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                        <span>🕒 Khung giờ: <strong>{getTimeDescription(sh.startTime)}</strong> đến <strong>{getTimeDescription(sh.endTime)}</strong></span>
                      </div>
                      {isEarlyMorning(sh.startTime) && (
                        <div className="flex items-center justify-between text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                          <span>⚠️ Bạn đang chọn <strong>{sh.startTime} ({getTimeDescription(sh.startTime)})</strong>. Bạn có muốn đổi sang buổi chiều?</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateEditShiftField(idx, 'startTime', convertToPm(sh.startTime));
                              handleUpdateEditShiftField(idx, 'endTime', convertToPm(sh.endTime));
                            }}
                            className="ml-2 font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 cursor-pointer"
                          >
                            Đổi sang {convertToPm(sh.startTime)} chiều ➔
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50 text-slate-600"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submittingEditEvent}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs cursor-pointer shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingEditEvent ? 'Đang lưu...' : 'Lưu Thay Đổi'}
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
              <div className="flex items-center gap-2">
                {shiftStudents.length > 0 && (
                  <button
                    onClick={() => handleResetAllInShift(selectedShiftForStudents.id, selectedShiftForStudents.shiftName)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                    title="Reset lượt thi cho toàn bộ thí sinh trong ca này để làm lại"
                  >
                    <span>🔄</span> Reset cả ca thi
                  </button>
                )}
                <button
                  onClick={() => setSelectedShiftForStudents(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetStudentRegistration(st.id, st.fullName)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg cursor-pointer text-[11px]"
                              title="Cho phép thí sinh làm lại từ đầu (xóa bài dở dang/hết giờ)"
                            >
                              🔄 Thi lại
                            </button>
                            <button
                              onClick={() => handleOpenScoreStudent(st)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer text-[11px]"
                            >
                              Chấm điểm
                            </button>
                          </div>
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

      {/* MODAL CẤU HÌNH ĐỀ THI ONLINE (PDF, AUDIO, BÀI ĐỌC, 40 CÂU HỎI) */}
      {configExamEvent && (
        <EventExamConfigModal
          event={configExamEvent}
          onClose={() => setConfigExamEvent(null)}
          onSuccess={() => {
            fetchAdminData();
            if (selectedExamEventId) {
              fetchOnlineRegistrations(Number(selectedExamEventId));
            }
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL XEM CHI TIẾT BÀI LÀM CỦA HỌC VIÊN */}
      {viewingRegistrationId && (
        <StudentExamDetailModal
          registrationId={viewingRegistrationId}
          onClose={() => setViewingRegistrationId(null)}
        />
      )}
    </div>
  );
}
