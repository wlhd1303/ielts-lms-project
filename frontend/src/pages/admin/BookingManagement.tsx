import React, { useState, useEffect } from 'react';
import {
  bookingService,
  type SupportBooking,
  type TestEvent,
  type TestEventRegistration,
  type TaAvailabilitySlot
} from '../../services/bookingService';
import EventExamConfigModal from './EventExamConfigModal';
import StudentExamDetailModal from './StudentExamDetailModal';
import EventLeaderboardModal from '../../components/booking/EventLeaderboardModal';

export default function BookingManagement() {
  const [activeSection, setActiveSection] = useState<'support' | 'ta_schedule' | 'events' | 'online_exam'>('support');
  const [adminBookings, setAdminBookings] = useState<SupportBooking[]>([]);
  const [adminEvents, setAdminEvents] = useState<TestEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // --- LỊCH RẢNH TRỢ GIẢNG THEO TUẦN (TA AVAILABILITY) ---
  const getMondayOfDate = (dateObj: Date): string => {
    const d = new Date(dateObj);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => getMondayOfDate(new Date()));
  const [selectedTaFilter, setSelectedTaFilter] = useState<string>('ALL');
  const [taScheduleSlots, setTaScheduleSlots] = useState<TaAvailabilitySlot[]>([]);
  const [loadingTaSchedule, setLoadingTaSchedule] = useState(false);
  const [availableTas, setAvailableTas] = useState<Array<{ id: string; name: string }>>([
    { id: 'khanh', name: 'Trợ giảng Khanh' }
  ]);

  // Modal Thêm ca rảnh
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotTaId, setSlotTaId] = useState('khanh');
  const [slotTaName, setSlotTaName] = useState('Trợ giảng Khanh');
  const [slotDate, setSlotDate] = useState(selectedWeekStart);
  const [slotStartTime, setSlotStartTime] = useState('17:30');
  const [slotEndTime, setSlotEndTime] = useState('18:00');
  const [slotSkill, setSlotSkill] = useState('ALL');
  const [slotCapacity, setSlotCapacity] = useState(1);
  const [slotNote, setSlotNote] = useState('');
  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [seedingKhanhLoading, setSeedingKhanhLoading] = useState(false);

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
  const [selectedLeaderboardEvent, setSelectedLeaderboardEvent] = useState<TestEvent | null>(null);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
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

  const fetchTeachingAssistantsList = async () => {
    try {
      const tas = await bookingService.getTeachingAssistants();
      const list = [{ id: 'khanh', name: 'Trợ giảng Khanh' }];
      if (Array.isArray(tas)) {
        tas.forEach((t: any) => {
          if (t.id && !list.some((item) => item.id === t.id)) {
            list.push({ id: t.id, name: t.fullName || t.name || t.id });
          }
        });
      }
      setAvailableTas(list);
    } catch (err) {
      console.error('Lỗi tải danh sách TA:', err);
    }
  };

  const fetchTaSchedule = async () => {
    setLoadingTaSchedule(true);
    try {
      const data = await bookingService.getWeeklySchedule(
        selectedWeekStart,
        selectedTaFilter !== 'ALL' ? selectedTaFilter : undefined
      );
      setTaScheduleSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải lịch rảnh trợ giảng:', err);
      setTaScheduleSlots([]);
    } finally {
      setLoadingTaSchedule(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchTeachingAssistantsList();
  }, []);

  useEffect(() => {
    if (activeSection === 'ta_schedule') {
      fetchTaSchedule();
    }
  }, [activeSection, selectedWeekStart, selectedTaFilter]);

  const handlePrevWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() - 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    setSelectedWeekStart(getMondayOfDate(new Date()));
  };

  const handleSeedKhanh = async () => {
    if (!window.confirm(`Khởi tạo tự động 37 ca tuần từ ${selectedWeekStart} cho Trợ giảng Khanh?\n- T2, T4, T6, T7: 17:30 - 21:30 (ca cuối 21:00)\n- CN: 17:00 - 19:30\n- T3, T5: Nghỉ`)) return;
    setSeedingKhanhLoading(true);
    try {
      const res = await bookingService.seedKhanhSchedule(selectedWeekStart);
      showToast(`Đã tạo thành công ${res.length} ca rảnh tuần cho Trợ giảng Khanh!`, 'success');
      await fetchTaSchedule();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể tạo lịch cho Khanh', 'error');
    } finally {
      setSeedingKhanhLoading(false);
    }
  };

  const handleCopyWeek = async () => {
    const toD = new Date(selectedWeekStart);
    toD.setDate(toD.getDate() + 7);
    const targetWeekStr = toD.toISOString().split('T')[0];

    const taIdToCopy = selectedTaFilter !== 'ALL' ? selectedTaFilter : 'khanh';
    const taNameToCopy = availableTas.find((t) => t.id === taIdToCopy)?.name || 'Trợ giảng Khanh';

    if (!window.confirm(`Sao chép toàn bộ lịch rảnh của "${taNameToCopy}" từ tuần (${selectedWeekStart}) sang tuần kế tiếp (${targetWeekStr})?`)) return;

    try {
      const res = await bookingService.copyWeeklySchedule({
        taId: taIdToCopy,
        taName: taNameToCopy,
        fromWeekStartDate: selectedWeekStart,
        toWeekStartDate: targetWeekStr
      });
      showToast(`Đã sao chép thành công ${res.length} ca sang tuần ${targetWeekStr}!`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể sao chép lịch', 'error');
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ca rảnh này không?')) return;
    try {
      await bookingService.deleteAvailabilitySlot(slotId);
      showToast('Đã xóa ca rảnh thành công!', 'success');
      fetchTaSchedule();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể xóa ca rảnh', 'error');
    }
  };

  const handleCreateSlot = async () => {
    setSubmittingSlot(true);
    try {
      await bookingService.saveWeeklySchedule({
        taId: slotTaId,
        taName: slotTaName,
        weekStartDate: selectedWeekStart,
        slots: [
          {
            availableDate: slotDate,
            startTime: slotStartTime,
            endTime: slotEndTime,
            skill: slotSkill,
            maxCapacity: slotCapacity,
            note: slotNote,
            status: 'OPEN'
          }
        ]
      });
      showToast('Đã thêm ca rảnh thành công!', 'success');
      setShowAddSlotModal(false);
      fetchTaSchedule();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể thêm ca rảnh', 'error');
    } finally {
      setSubmittingSlot(false);
    }
  };

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

  const handleCancelSupportBooking = async (b: SupportBooking) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy ca hỗ trợ này (${b.bookingDate} ${b.startTime}-${b.endTime})? Hành động này sẽ tự động cập nhật và đồng bộ sang hệ thống bên kia.`)) return;
    try {
      await bookingService.cancelSupportBookingAdmin(b.id);
      showToast('Đã hủy ca hỗ trợ và đồng bộ sang hệ thống quản lý thành công!', 'success');
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể hủy ca hỗ trợ.';
      showToast(errorMsg, 'error');
    }
  };

  const handleDeleteSupportBooking = async (b: SupportBooking) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ca hỗ trợ này (${b.bookingDate} ${b.startTime}-${b.endTime})? Dữ liệu trên cả hai hệ thống sẽ bị xóa hoàn toàn.`)) return;
    try {
      await bookingService.deleteSupportBookingAdmin(b.id);
      showToast('Đã xóa vĩnh viễn ca hỗ trợ và đồng bộ sang hệ thống quản lý thành công!', 'success');
      fetchAdminData();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể xóa ca hỗ trợ.';
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
              onClick={() => setActiveSection('ta_schedule')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'ta_schedule' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Lịch Rảnh Trợ Giảng
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

          {activeSection === 'ta_schedule' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedKhanh}
                disabled={seedingKhanhLoading}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Khởi tạo nhanh 37 ca tuần cho Trợ giảng Khanh"
              >
                <span>⚡</span> {seedingKhanhLoading ? 'Đang tạo...' : 'Set Lịch Trợ Giảng Khanh'}
              </button>
              <button
                onClick={() => {
                  setSlotDate(selectedWeekStart);
                  setShowAddSlotModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span> Mở Ca Rảnh
              </button>
            </div>
          )}

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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEvaluate(b)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg cursor-pointer transition-colors text-[11px]"
                          title="Chấm điểm & Nhận xét"
                        >
                          Chấm điểm
                        </button>
                        {b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelSupportBooking(b)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg cursor-pointer transition-colors text-[11px]"
                            title="Hủy ca (đồng bộ hệ thống liên kết)"
                          >
                            Hủy
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSupportBooking(b)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg cursor-pointer transition-colors text-[11px]"
                          title="Xóa vĩnh viễn (xóa ở cả 2 bên)"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: QUẢN LÝ LỊCH RẢNH TRỢ GIẢNG THEO TUẦN (TA AVAILABILITY) */}
      {activeSection === 'ta_schedule' && (() => {
        const monday = new Date(selectedWeekStart);
        const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
        const weekDays = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
          const d = new Date(monday);
          d.setDate(d.getDate() + offset);
          const iso = d.toISOString().split('T')[0];
          const dayNum = d.getDate();
          const monthNum = d.getMonth() + 1;
          return {
            offset,
            dayName: dayNames[offset],
            dateIso: iso,
            dateFormatted: `${dayNum < 10 ? '0' + dayNum : dayNum}/${monthNum < 10 ? '0' + monthNum : monthNum}`
          };
        });

        return (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            {/* Thanh Điều Hướng & Bộ Lọc Tuần */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={handlePrevWeek}
                    className="px-3 py-1.5 hover:bg-white rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer"
                    title="Tuần trước"
                  >
                    ◀ Tuần trước
                  </button>
                  <button
                    onClick={handleCurrentWeek}
                    className="px-3 py-1.5 hover:bg-white rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Tuần này
                  </button>
                  <button
                    onClick={handleNextWeek}
                    className="px-3 py-1.5 hover:bg-white rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer"
                    title="Tuần kế tiếp"
                  >
                    Tuần sau ▶
                  </button>
                </div>

                <span className="text-xs font-black text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                  📅 {weekDays[0].dateFormatted} — {weekDays[6].dateFormatted} ({selectedWeekStart})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>👤 Lọc Trợ giảng:</span>
                  <select
                    value={selectedTaFilter}
                    onChange={(e) => setSelectedTaFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Trợ giảng</option>
                    {availableTas.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCopyWeek}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Sao chép toàn bộ lịch tuần này sang tuần sau"
                >
                  <span>📋</span> Sao Chép Sang Tuần Sau
                </button>

                <button
                  onClick={fetchTaSchedule}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Làm mới lịch"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Lưới Lịch 7 Ngày */}
            {loadingTaSchedule ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                <span className="animate-spin text-base">⏳</span> Đang tải lịch rảnh trợ giảng...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const daySlots = taScheduleSlots.filter((s) => s.availableDate === day.dateIso);
                  const isToday = day.dateIso === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={day.dateIso}
                      className={`rounded-2xl border flex flex-col min-h-[320px] transition-all ${
                        isToday ? 'border-blue-400 bg-blue-50/20 shadow-xs' : 'border-slate-200/80 bg-slate-50/50'
                      }`}
                    >
                      {/* Header Ngày */}
                      <div className={`p-3 border-b text-center rounded-t-2xl ${
                        isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                      }`}>
                        <div className="text-xs font-black">{day.dayName}</div>
                        <div className={`text-[11px] font-bold mt-0.5 ${isToday ? 'text-blue-100' : 'text-slate-500'}`}>
                          {day.dateFormatted}
                        </div>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                            daySlots.length > 0 ? (isToday ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700') : 'bg-slate-200/80 text-slate-500'
                          }`}>
                            {daySlots.length} ca
                          </span>
                        </div>
                      </div>

                      {/* Danh Sách Slot */}
                      <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[460px] custom-scrollbar">
                        {daySlots.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs font-bold italic">
                            ☕ Nghỉ / Chưa mở ca
                          </div>
                        ) : (
                          daySlots.map((slot) => {
                            const isOpen = slot.status === 'OPEN';
                            const isFull = slot.status === 'FULL';

                            return (
                              <div
                                key={slot.id}
                                className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all shadow-2xs group relative ${
                                  isFull
                                    ? 'bg-purple-50/60 border-purple-200/80 text-purple-900'
                                    : isOpen
                                    ? 'bg-white border-emerald-200/80 text-slate-800 hover:border-emerald-300'
                                    : 'bg-slate-100 border-slate-200 text-slate-500'
                                }`}
                              >
                                <div className="flex items-center justify-between font-black text-xs">
                                  <span className="flex items-center gap-1 text-slate-900">
                                    <span>⏰</span> {slot.startTime} - {slot.endTime}
                                  </span>
                                  <button
                                    onClick={() => slot.id && handleDeleteSlot(slot.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                    title="Xóa ca rảnh này"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="text-[11px] font-bold text-slate-600 truncate flex items-center gap-1">
                                  <span>👤</span> {slot.taName}
                                </div>

                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                    isFull
                                      ? 'bg-purple-100 text-purple-700'
                                      : isOpen
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {isFull ? 'Đầy chỗ' : isOpen ? 'Còn trống' : slot.status}
                                  </span>

                                  {slot.skill && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {slot.skill === 'ALL' ? 'Tất cả kỹ năng' : slot.skill}
                                    </span>
                                  )}

                                  {slot.maxCapacity > 1 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                                      Nhóm (TĐ {slot.maxCapacity})
                                    </span>
                                  )}
                                </div>

                                {slot.note && (
                                  <div className="text-[10px] text-slate-500 italic truncate" title={slot.note}>
                                    📝 {slot.note}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Nút Thêm Ca Ngày Này */}
                      <div className="p-2 border-t border-slate-100 bg-white/50 rounded-b-2xl">
                        <button
                          onClick={() => {
                            setSlotDate(day.dateIso);
                            setShowAddSlotModal(true);
                          }}
                          className="w-full py-1.5 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>+</span> Thêm ca
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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
                      <>
                        <button
                          onClick={() => {
                            setSelectedLeaderboardEvent(ev);
                            setShowLeaderboardModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Xem & điều hành Bảng Xếp Hạng đợt thi"
                        >
                          🏆 BXH
                        </button>
                        <button
                          onClick={() => setConfigExamEvent(ev)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Upload đề thi & bảng đáp án"
                        >
                          📝 Soạn Đề
                        </button>
                      </>
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
                        onClick={() => {
                          setSelectedLeaderboardEvent(currentEv);
                          setShowLeaderboardModal(true);
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🏆</span>
                        <span>Điều Hành Bảng Xếp Hạng</span>
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

      {/* MODAL THÊM CA RẢNH MỚI CHO TRỢ GIẢNG */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>➕</span> Mở Ca Rảnh Mới Cho Trợ Giảng
              </h3>
              <button
                onClick={() => setShowAddSlotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Trợ Giảng Phụ Trách</label>
                <select
                  value={slotTaId}
                  onChange={(e) => {
                    const sel = availableTas.find((t) => t.id === e.target.value);
                    setSlotTaId(e.target.value);
                    if (sel) setSlotTaName(sel.name);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {availableTas.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày Trực</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ Bắt Đầu</label>
                  <select
                    value={slotStartTime}
                    onChange={(e) => {
                      const start = e.target.value;
                      setSlotStartTime(start);
                      const [h, m] = start.split(':').map(Number);
                      const total = h * 60 + m + 30;
                      const endH = Math.floor(total / 60);
                      const endM = total % 60;
                      setSlotEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
                  >
                    {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ Kết Thúc</label>
                  <input
                    type="text"
                    value={slotEndTime}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỹ Năng Hỗ Trợ</label>
                  <select
                    value={slotSkill}
                    onChange={(e) => setSlotSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="ALL">Mọi kỹ năng</option>
                    <option value="SPEAKING">Speaking (Nói)</option>
                    <option value="WRITING">Writing (Viết)</option>
                    <option value="READING">Reading (Đọc)</option>
                    <option value="LISTENING">Listening (Nghe)</option>
                    <option value="VOCABULARY">Từ vựng & Ngữ pháp</option>
                    <option value="GENERAL">Giải đáp chung</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sĩ Số Tối Đa</label>
                  <select
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
                  >
                    <option value={1}>1 Học viên (1-1)</option>
                    <option value={5}>5 Học viên (Nhóm R/L/W)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Ca Trực (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="VD: Online Google Meet / Trực tại P.102"
                  value={slotNote}
                  onChange={(e) => setSlotNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingSlot}
                onClick={handleCreateSlot}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingSlot ? 'Đang lưu...' : 'Lưu Ca Rảnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐIỀU HÀNH BẢNG XẾP HẠNG ĐỢT THI (ADMIN) */}
      {selectedLeaderboardEvent && (
        <EventLeaderboardModal
          isOpen={showLeaderboardModal}
          onClose={() => {
            setShowLeaderboardModal(false);
            setSelectedLeaderboardEvent(null);
          }}
          eventId={selectedLeaderboardEvent.id}
          isAdmin={true}
          shifts={selectedLeaderboardEvent.shifts}
        />
      )}
    </div>
  );
}
