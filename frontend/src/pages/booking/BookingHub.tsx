import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  bookingService,
  type AvailableSlot,
  type SupportBooking,
  type TestEvent,
  type TestEventRegistration
} from '../../services/bookingService';
import { authService } from '../../services/authService';

const SKILLS = [
  { key: 'SPEAKING', label: 'Speaking (Nói)', emoji: '🗣️' },
  { key: 'WRITING', label: 'Writing (Viết)', emoji: '✍️' },
  { key: 'READING', label: 'Reading (Đọc)', emoji: '📖' },
  { key: 'LISTENING', label: 'Listening (Nghe)', emoji: '🎧' },
  { key: 'VOCABULARY', label: 'Từ vựng & Ngữ pháp', emoji: '📚' },
  { key: 'GENERAL', label: 'Giải đáp thắc mắc chung', emoji: '💡' }
];

export default function BookingHub() {
  const navigate = useNavigate();

  // Tab: 'support' | 'events'
  const [activeTab, setActiveTab] = useState<'support' | 'events'>('support');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- STATE TAB SUPPORT ---
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [myBookings, setMyBookings] = useState<SupportBooking[]>([]);

  // Modal đặt lịch 30p
  const [bookingModalSlot, setBookingModalSlot] = useState<AvailableSlot | null>(null);
  const [isCustomTimeMode, setIsCustomTimeMode] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [selectedSkill, setSelectedSkill] = useState('SPEAKING');
  const [studentNote, setStudentNote] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // --- STATE TAB EVENTS ---
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState<TestEventRegistration[]>([]);
  const [registeringShift, setRegisteringShift] = useState<any | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Thông báo Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Khởi tạo thông tin người dùng
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const profile: any = await authService.getProfile();
        const user = profile?.data?.data || profile?.data || profile;
        setCurrentUser(user);
        const role = (user.role || '').toUpperCase();
        if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
          setIsAdmin(true);
        }
        if (user.fullName || user.username) {
          setRegFullName(user.fullName || user.username);
        }
        if (user.phone) {
          setRegPhone(user.phone);
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin người dùng:', err);
      }
    };
    fetchUser();
  }, []);

  // Tải dữ liệu khi chuyển Tab hoặc đổi ngày
  useEffect(() => {
    if (activeTab === 'support') {
      fetchSlots();
      fetchMyBookings();
    } else if (activeTab === 'events') {
      fetchEvents();
      fetchMyRegistrations();
    }
  }, [selectedDate, activeTab]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    try {
      const data = await bookingService.getAvailableSlots(selectedDate);
      setSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách khung giờ:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setMyBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải lịch sử đặt ca hỗ trợ:', err);
      setMyBookings([]);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await bookingService.getOpenEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải sự kiện thi thử:', err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const data = await bookingService.getMyRegistrations();
      setMyRegistrations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách ca thi đã đăng ký:', err);
      setMyRegistrations([]);
    }
  };

  // --- ACTIONS SUPPORT ---
  const calculateEndTime = (startTime: string) => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const total = h * 60 + m + 30;
      const endH = Math.floor(total / 60);
      const endM = total % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const handleOpenBookingModal = (slot: AvailableSlot) => {
    if (!slot.available) return;
    setIsCustomTimeMode(false);
    setBookingModalSlot(slot);
    if (slot.isGroup && slot.skill) {
      setSelectedSkill(slot.skill);
    }
    setStudentNote('');
  };

  const handleOpenCustomBookingModal = () => {
    setIsCustomTimeMode(true);
    const start = customStartTime || '09:00';
    const end = calculateEndTime(start);
    setBookingModalSlot({
      startTime: start,
      endTime: end,
      available: true,
      bookedByMe: false
    });
    setStudentNote('');
  };

  const handleConfirmBooking = async () => {
    if (!bookingModalSlot) return;
    setSubmittingBooking(true);
    try {
      const start = isCustomTimeMode ? customStartTime : bookingModalSlot.startTime;
      const end = isCustomTimeMode ? calculateEndTime(customStartTime) : bookingModalSlot.endTime;

      await bookingService.bookSupportSession({
        bookingDate: selectedDate,
        startTime: start,
        endTime: end,
        skill: selectedSkill,
        studentNote: studentNote
      });
      showToast('Đặt ca hỗ trợ 30 phút thành công! Trợ giảng sẽ chuẩn bị hỗ trợ bạn.', 'success');
      setBookingModalSlot(null);
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể đặt ca hỗ trợ. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy ca hỗ trợ này không?')) return;
    try {
      await bookingService.cancelBooking(id);
      showToast('Đã hủy ca hỗ trợ thành công', 'success');
      await Promise.all([fetchSlots(), fetchMyBookings()]);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể hủy ca hỗ trợ. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };

  // --- ACTIONS EVENTS ---
  const handleOpenRegisterShift = (shift: any) => {
    setRegisteringShift(shift);
  };

  const handleConfirmRegisterShift = async () => {
    if (!registeringShift) return;
    setSubmittingReg(true);
    try {
      await bookingService.registerShift({
        shiftId: registeringShift.id,
        fullName: regFullName,
        phone: regPhone
      });
      showToast('Đăng ký ca thi thành công! Hãy đến đúng giờ nhé.', 'success');
      setRegisteringShift(null);
      await Promise.all([fetchEvents(), fetchMyRegistrations()]);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể đăng ký ca thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleCancelReg = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn hủy đăng ký ca thi này không?')) return;
    try {
      await bookingService.cancelRegistration(id);
      showToast('Đã hủy đăng ký ca thi', 'success');
      await Promise.all([fetchEvents(), fetchMyRegistrations()]);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể hủy đăng ký ca thi. Vui lòng thử lại!';
      showToast(errorMsg, 'error');
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : 'bg-rose-500 text-white border-rose-600'
          }`}
        >
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-xl border border-slate-200/80 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5"
            >
              <span>←</span>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>🗓️</span> Lịch Hỗ Trợ & Thi Thử
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 hidden sm:block">
                Hệ thống đặt ca kèm 1-1 chuyên sâu và đăng ký thi thử IELTS tập trung
              </p>
            </div>
          </div>

          {/* Right Controls: Tab Switch + Test Admin Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70 text-xs font-bold">
              <button
                onClick={() => setActiveTab('support')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'support'
                    ? 'bg-white text-blue-600 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🤝 Ca Hỗ Trợ 30p
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-white text-blue-600 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎯 Sự Kiện & Thi Test
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                title="Đến trang quản trị hệ thống"
              >
                <span>⚙️</span>
                <span>Admin Portal →</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ========================================================================= */}
        {/* TAB 1: ĐẶT CA HỖ TRỢ 30 PHÚT                                            */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Banner giới thiệu */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="relative z-10 max-w-2xl space-y-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider">
                  ⚡ Kèm 1-1 Học Viên Chủ Động
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Tự Chọn Giờ Rảnh - Trợ Giảng Sẽ Có Mặt
                </h2>
                <p className="text-xs sm:text-sm text-blue-100 font-medium">
                  Mỗi ca hỗ trợ kéo dài <strong>30 phút</strong>. Hãy chuẩn bị trước câu hỏi, bài viết hoặc phần nói bạn cần được chỉnh sửa để đạt hiệu quả cao nhất.
                </p>
              </div>
              <div className="absolute -right-6 -bottom-10 text-9xl opacity-15 select-none pointer-events-none">
                💬
              </div>
            </div>

            {/* Thanh chọn ngày & Lọc khung giờ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
                  📅
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                    Chọn ngày bạn muốn được hỗ trợ
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-black text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 mt-0.5 outline-none focus:border-blue-600 bg-slate-50 cursor-pointer"
                  />
                </div>
              </div>

              {/* Chú giải trạng thái */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 ring-2 ring-emerald-200"></span>
                  <span>Còn trống</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-indigo-500 ring-2 ring-indigo-200"></span>
                  <span>Nhóm (tối đa 5 bạn)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-300 ring-2 ring-slate-200"></span>
                  <span>Đã kín chỗ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-400 ring-2 ring-amber-200"></span>
                  <span>Ca của bạn</span>
                </div>
              </div>
            </div>

            {/* Grid các khung giờ 30 phút */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>⏰</span> Khung giờ ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenCustomBookingModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <span>⚡</span> Tùy chọn giờ linh động
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    {slots.filter((s) => s.available).length} ca khả dụng
                  </span>
                </div>
              </div>

              {loadingSlots ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 mt-3">Đang kiểm tra lịch trống...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">
                  Không có ca nào trong ngày này.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {slots.map((slot, index) => {
                    if (slot.bookedByMe) {
                      return (
                        <div
                          key={index}
                          className="bg-amber-50/80 border-2 border-amber-400 p-3.5 rounded-2xl shadow-sm text-center space-y-2 relative"
                        >
                          <span className="absolute top-2 right-2 text-xs font-black text-amber-600">
                            ⭐
                          </span>
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                            Ca của bạn
                          </p>
                          <p className="text-base font-black text-slate-900">
                            {slot.startTime} - {slot.endTime}
                          </p>
                          {slot.skill && (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {slot.skill} {slot.isGroup && `(${slot.currentRegistered}/5)`}
                            </span>
                          )}
                          <button
                            onClick={() => slot.bookingId && handleCancelBooking(slot.bookingId)}
                            className="w-full py-1 text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                          >
                            Hủy ca này
                          </button>
                        </div>
                      );
                    }

                    if (!slot.available) {
                      return (
                        <div
                          key={index}
                          className="bg-slate-100/70 border border-slate-200 p-3.5 rounded-2xl text-center space-y-1.5 opacity-60 cursor-not-allowed"
                        >
                          <p className="text-[11px] font-bold text-slate-400">Đã kín chỗ</p>
                          <p className="text-sm font-black text-slate-500">
                            {slot.startTime} - {slot.endTime}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">
                            🔒 Khóa {slot.isGroup && '(Đủ 5/5)'}
                          </span>
                        </div>
                      );
                    }

                    const isGroupJoinable = slot.isGroup && slot.currentRegistered && slot.currentRegistered > 0;

                    return (
                      <button
                        key={index}
                        onClick={() => handleOpenBookingModal(slot)}
                        className={`border-2 p-3.5 rounded-2xl text-center space-y-1.5 transition-all cursor-pointer group ${
                          isGroupJoinable
                            ? 'bg-indigo-50/30 border-indigo-400/80 hover:border-indigo-600 hover:bg-indigo-50/70 hover:shadow-md'
                            : 'bg-white border-emerald-400/80 hover:border-emerald-600 hover:bg-emerald-50/40 hover:shadow-md'
                        }`}
                      >
                        {isGroupJoinable ? (
                          <span className="inline-block text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            👥 Nhóm ({slot.currentRegistered}/5)
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            🟢 Còn trống
                          </span>
                        )}
                        <p className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-all">
                          {slot.startTime} - {slot.endTime}
                        </p>
                        <p className={`text-[11px] font-bold ${isGroupJoinable ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          {isGroupJoinable ? `Ghép ${slot.skill} (còn ${5 - (slot.currentRegistered || 0)}) →` : 'Đặt 30 phút →'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mục: Lịch sử ca hỗ trợ của học viên */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📋</span> Lịch Sử Ca Kèm Của Bạn ({myBookings.length})
              </h3>

              {myBookings.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 font-bold text-xs">
                  Bạn chưa đăng ký ca hỗ trợ nào. Hãy chọn một khung giờ phía trên để bắt đầu!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 relative hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {new Date(b.bookingDate).toLocaleDateString('vi-VN')}
                          </span>
                          <h4 className="text-base font-black text-slate-900">
                            {b.startTime} - {b.endTime}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            b.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-700'
                              : b.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {b.status === 'COMPLETED'
                            ? '✅ Đã hoàn thành'
                            : b.status === 'CANCELLED'
                            ? '❌ Đã hủy'
                            : '⏳ Sắp diễn ra'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                        <p>
                          <strong className="text-slate-900">Kỹ năng:</strong>{' '}
                          {SKILLS.find((s) => s.key === b.skill)?.label || b.skill}
                        </p>
                        {b.studentNote && (
                          <p className="text-slate-500 italic">
                            &quot;{b.studentNote}&quot;
                          </p>
                        )}
                        {b.assignedTaName && (
                          <p className="text-blue-600 font-bold">
                            Trợ giảng: {b.assignedTaName}
                          </p>
                        )}
                      </div>

                      {/* Đánh giá & Nhận xét của Trợ giảng */}
                      {b.status === 'COMPLETED' && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          {b.score !== null && b.score !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-500">Điểm đánh giá:</span>
                              <span className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                                ⭐ {b.score} / 9.0
                              </span>
                            </div>
                          )}
                          {b.taComment && (
                            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-xs text-amber-900">
                              <p className="font-bold text-[10px] uppercase text-amber-700 mb-1">
                                💬 Lời dặn từ Trợ giảng:
                              </p>
                              <p className="italic leading-relaxed">{b.taComment}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-rose-200"
                        >
                          Hủy ca này
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SỰ KIỆN & THI TEST TRỰC TIẾP                                      */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Banner giới thiệu */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="relative z-10 max-w-2xl space-y-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider">
                  🎯 IELTS Mock Test & Workshop
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Kỳ Thi Thử & Sự Kiện Trực Tiếp
                </h2>
                <p className="text-xs sm:text-sm text-indigo-100 font-medium">
                  Trải nghiệm áp lực phòng thi thật, chấm điểm 4 kỹ năng theo thang chuẩn IELTS và nhận phản hồi chi tiết từ đội ngũ Giảng viên.
                </p>
              </div>
              <div className="absolute -right-6 -bottom-10 text-9xl opacity-15 select-none pointer-events-none">
                🏆
              </div>
            </div>

            {/* Danh sách sự kiện mở */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🔥</span> Các Kỳ Thi Thử Sắp Diễn Ra ({events.length})
              </h3>

              {loadingEvents ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400 mt-3">Đang tải sự kiện...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold text-sm">
                  Hiện chưa có đợt thi thử nào mở đăng ký. Hãy quay lại sau nhé!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[11px] font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                            📅 {new Date(ev.eventDate).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Đang mở đăng ký
                          </span>
                        </div>

                        <h4 className="text-xl font-black text-slate-900 leading-snug">{ev.title}</h4>
                        {ev.description && (
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1.5">
                            <span>📍</span> {ev.location}
                          </span>
                        </div>
                      </div>

                      {/* Danh sách các ca thi (Shifts) */}
                      <div className="space-y-2.5 pt-2">
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                          Chọn ca thi bạn muốn tham gia:
                        </p>
                        <div className="space-y-2">
                          {ev.shifts &&
                            ev.shifts.map((shift) => {
                              const isFull = shift.currentRegistered >= shift.maxCapacity;
                              const percent = Math.min(
                                100,
                                Math.round((shift.currentRegistered / shift.maxCapacity) * 100)
                              );
                              const isAlreadyRegistered = myRegistrations.some(
                                (r) => r.shift?.id === shift.id && r.status !== 'CANCELLED'
                              );

                              return (
                                <div
                                  key={shift.id}
                                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900">
                                      {shift.shiftName} ({shift.startTime} - {shift.endTime})
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${
                                            isFull ? 'bg-rose-500' : 'bg-indigo-600'
                                          }`}
                                          style={{ width: `${percent}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {shift.currentRegistered}/{shift.maxCapacity} chỗ
                                      </span>
                                    </div>
                                  </div>

                                  {isAlreadyRegistered ? (
                                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl shrink-0">
                                      ✓ Đã đăng ký
                                    </span>
                                  ) : isFull ? (
                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-200 px-3 py-1.5 rounded-xl shrink-0">
                                      Hết chỗ
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenRegisterShift(shift)}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-sm"
                                    >
                                      Đăng ký ca
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mục: Vé Dự Thi & Kết Quả Thi Của Bạn */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🎫</span> Vé Dự Thi & Kết Quả Của Bạn ({myRegistrations.length})
              </h3>

              {myRegistrations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 font-bold text-xs">
                  Bạn chưa đăng ký ca thi nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            Ca: {reg.shift?.shiftName}
                          </span>
                          <h4 className="text-base font-black text-slate-900 mt-1">
                            {reg.shift?.startTime} - {reg.shift?.endTime}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500">
                            Thí sinh: <strong className="text-slate-800">{reg.fullName}</strong>
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            reg.status === 'ATTENDED'
                              ? 'bg-blue-100 text-blue-700'
                              : reg.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {reg.status === 'ATTENDED'
                            ? '✅ Đã dự thi'
                            : reg.status === 'CANCELLED'
                            ? '❌ Đã hủy'
                            : '🎟️ Vé hợp lệ'}
                        </span>
                      </div>

                      {/* Bảng điểm chi tiết nếu đã có điểm */}
                      {reg.status === 'ATTENDED' && reg.overallScore !== null && reg.overallScore !== undefined && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-2xl border border-blue-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-900 uppercase">
                              Overall Band Score:
                            </span>
                            <span className="text-lg font-black text-blue-700 bg-white px-3 py-0.5 rounded-xl shadow-sm border border-blue-200">
                              🏆 {reg.overallScore}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-blue-200/50">
                            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400">Listening</p>
                              <p className="text-xs font-black text-slate-800">{reg.scoreListening ?? '-'}</p>
                            </div>
                            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400">Reading</p>
                              <p className="text-xs font-black text-slate-800">{reg.scoreReading ?? '-'}</p>
                            </div>
                            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400">Writing</p>
                              <p className="text-xs font-black text-slate-800">{reg.scoreWriting ?? '-'}</p>
                            </div>
                            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400">Speaking</p>
                              <p className="text-xs font-black text-slate-800">{reg.scoreSpeaking ?? '-'}</p>
                            </div>
                          </div>
                          {reg.feedback && (
                            <p className="text-xs text-slate-600 italic pt-1 leading-relaxed">
                              <strong className="text-slate-900">Nhận xét:</strong> {reg.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {reg.status === 'REGISTERED' && (
                        <button
                          onClick={() => handleCancelReg(reg.id)}
                          className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-rose-200"
                        >
                          Hủy đăng ký ca thi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: XÁC NHẬN ĐẶT CA HỖ TRỢ 30 PHÚT                                  */}
      {/* ========================================================================= */}
      {bookingModalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🗓️</span> Xác Nhận Đặt Ca Hỗ Trợ
              </h3>
              <button
                onClick={() => setBookingModalSlot(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isCustomTimeMode ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-blue-900">
                    Ngày: <span className="font-black">{new Date(selectedDate).toLocaleDateString('vi-VN')}</span>
                  </p>
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    ⚡ Tự chọn giờ linh động
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-900 tracking-wider block mb-1">
                      Giờ bắt đầu:
                    </label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full text-sm font-black text-slate-900 bg-white border border-blue-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-900 tracking-wider block mb-1">
                      Giờ kết thúc (+30p):
                    </label>
                    <div className="text-sm font-black text-slate-800 bg-white/90 border border-blue-200 rounded-xl px-3 py-1.5">
                      {calculateEndTime(customStartTime)}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-blue-700 font-medium">
                  🕒 Giờ làm việc Trợ giảng: Sáng (08:30-11:30), Chiều (14:00-18:00), Tối (18:30-21:30). Ca mở muộn nhất là <strong>21:00</strong>.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-1 text-xs">
                <p className="font-bold text-blue-900">
                  Ngày: <span className="font-black">{new Date(selectedDate).toLocaleDateString('vi-VN')}</span>
                </p>
                <p className="font-bold text-blue-900">
                  Khung giờ: <span className="font-black">{bookingModalSlot.startTime} - {bookingModalSlot.endTime} (30 phút)</span>
                </p>
                {bookingModalSlot.isGroup && bookingModalSlot.skill && (
                  <div className="pt-2">
                    <span className="inline-block text-[11px] font-black text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg">
                      👥 Buổi ghép nhóm kỹ năng {bookingModalSlot.skill} ({bookingModalSlot.currentRegistered}/5 học viên)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 block">
                  Kỹ năng bạn muốn được hỗ trợ:
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  R, L, W: Nhóm tối đa 5 bạn
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((sk) => {
                  const isLockedByGroup = !isCustomTimeMode && Boolean(bookingModalSlot.isGroup && bookingModalSlot.skill && bookingModalSlot.skill !== sk.key);
                  const isGroupSkillType = ['READING', 'LISTENING', 'WRITING'].includes(sk.key);

                  return (
                    <button
                      key={sk.key}
                      type="button"
                      disabled={isLockedByGroup}
                      onClick={() => setSelectedSkill(sk.key)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                        isLockedByGroup
                          ? 'opacity-40 border-slate-200 bg-slate-100 cursor-not-allowed'
                          : selectedSkill === sk.key
                          ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-black cursor-pointer'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{sk.emoji}</span>
                        <span className="truncate">{sk.label}</span>
                      </span>
                      {isGroupSkillType && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                          Nhóm
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">
                Ghi chú / Câu hỏi gửi trước cho Trợ giảng (không bắt buộc):
              </label>
              <textarea
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Ví dụ: Em muốn được sửa bài Writing Task 2 phần phản hồi ý kiến..."
                rows={3}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingModalSlot(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingBooking}
                onClick={handleConfirmBooking}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs hover:opacity-95 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submittingBooking ? 'Đang xác nhận...' : 'Xác Nhận Đặt Ca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ĐĂNG KÝ CA THI SỰ KIỆN                                          */}
      {/* ========================================================================= */}
      {registeringShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🎯</span> Đăng Ký Ca Thi Thử
              </h3>
              <button
                onClick={() => setRegisteringShift(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-1 text-xs">
              <p className="font-bold text-indigo-900">
                Ca thi: <span className="font-black">{registeringShift.shiftName}</span>
              </p>
              <p className="font-bold text-indigo-900">
                Thời gian: <span className="font-black">{registeringShift.startTime} - {registeringShift.endTime}</span>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên thí sinh:</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-600 bg-slate-50 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên hệ:</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-600 bg-slate-50 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegisteringShift(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={submittingReg}
                onClick={handleConfirmRegisterShift}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs hover:opacity-95 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submittingReg ? 'Đang xử lý...' : 'Xác Nhận Giữ Chỗ'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
