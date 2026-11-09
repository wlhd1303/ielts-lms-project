import axiosClient from './axiosClient';

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  bookedByMe: boolean;
  bookingId?: number;
  assignedTaName?: string;
  skill?: string;
  currentRegistered?: number;
  maxCapacity?: number;
  isGroup?: boolean;
}

export interface SupportBooking {
  id: number;
  user?: any;
  bookingDate: string;
  startTime: string;
  endTime: string;
  skill: string;
  studentNote?: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  assignedTaId?: string;
  assignedTaName?: string;
  isPresent?: boolean;
  absenceReason?: string;
  score?: number;
  taComment?: string;
  evaluatedAt?: string;
  createdAt?: string;
}

export interface TestEventShift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentRegistered: number;
}

export interface TestEvent {
  id: number;
  title: string;
  description?: string;
  eventDate: string;
  location: string;
  registrationDeadline?: string;
  status: 'OPEN' | 'CLOSED' | 'COMPLETED';
  examFormat?: 'OFFLINE' | 'ONLINE';
  skillType?: 'LISTENING' | 'READING' | 'BOTH';
  durationMinutes?: number;
  pdfUrl?: string;
  audioUrl?: string;
  passageText?: string;
  allowReview?: boolean;
  isLeaderboardPublic?: boolean;
  shifts: TestEventShift[];
  createdAt?: string;
}

export interface TestEventRegistration {
  id: number;
  shift: TestEventShift;
  user?: any;
  fullName: string;
  phone?: string;
  email?: string;
  status: 'REGISTERED' | 'IN_PROGRESS' | 'SUBMITTED' | 'ATTENDED' | 'ABSENT' | 'CANCELLED';
  examStartedAt?: string;
  examSubmittedAt?: string;
  studentAnswers?: string;
  listeningCorrectCount?: number;
  readingCorrectCount?: number;
  scoreListening?: number;
  scoreReading?: number;
  scoreWriting?: number;
  scoreSpeaking?: number;
  overallScore?: number;
  feedback?: string;
  registeredAt?: string;
}

export interface ExamAccessStatus {
  status: 'EARLY' | 'OPEN_WINDOW' | 'IN_PROGRESS' | 'SUBMITTED' | 'MISSED_WINDOW' | 'EXPIRED' | 'NOT_REGISTERED';
  registrationId?: number;
  eventId?: number;
  shiftId?: number;
  eventTitle?: string;
  shiftName?: string;
  examFormat?: string;
  skillType?: string;
  durationMinutes?: number;
  serverTime?: string;
  windowStart?: string;
  windowEnd?: string;
  examStartedAt?: string;
  personalDeadline?: string;
  secondsUntilWindow?: number;
  secondsRemainingInExam?: number;
  allowReview?: boolean;
}

export interface StudentQuestion {
  skill: string;
  questionNumber: number;
  questionText?: string;
}

export interface StartExamResponse {
  registrationId: number;
  eventId: number;
  shiftId: number;
  eventTitle: string;
  shiftName: string;
  skillType: string;
  durationMinutes: number;
  startedAt: string;
  deadline: string;
  remainingSeconds: number;
  pdfUrl?: string;
  audioUrl?: string;
  passageText?: string;
  questions: StudentQuestion[];
}

export interface QuestionReviewDetail {
  skill: string;
  questionNumber: number;
  questionText?: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ExamSubmissionResult {
  registrationId: number;
  eventId: number;
  shiftId: number;
  studentName: string;
  eventTitle: string;
  shiftName: string;
  skillType: string;
  listeningCorrectCount?: number;
  readingCorrectCount?: number;
  scoreListening?: number;
  scoreReading?: number;
  overallScore?: number;
  submittedAt?: string;
  feedback?: string;
  allowReview?: boolean;
  reviewDetails?: QuestionReviewDetail[];
}

export interface QuestionStat {
  questionNumber: number;
  skill: string;
  wrongCount: number;
  totalAttempts: number;
  wrongRate: number;
}

export interface EventLeaderboardItem {
  rank: number;
  registrationId: number;
  userId: number;
  fullName: string;
  username: string;
  avatarUrl?: string;
  shiftId: number;
  shiftName: string;
  scoreListening?: number;
  scoreReading?: number;
  scoreWriting?: number;
  scoreSpeaking?: number;
  overallScore?: number;
  correctCount: number;
  totalQuestions: number;
  durationMinutes: number;
  submittedAt?: string;
  phone?: string;
  email?: string;
  isCurrentUser?: boolean;
}

export interface EventLeaderboardData {
  eventId: number;
  eventTitle: string;
  skillType: 'LISTENING' | 'READING' | 'BOTH';
  isPublic: boolean;
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  topHardestQuestions: QuestionStat[];
  myRank?: EventLeaderboardItem;
  topThree: EventLeaderboardItem[];
  rankings: EventLeaderboardItem[];
}

export interface EventExamConfig {
  examFormat?: string;
  skillType?: string;
  durationMinutes?: number;
  pdfUrl?: string;
  audioUrl?: string;
  passageText?: string;
  allowReview?: boolean;
  questions?: Array<{
    skill: string;
    questionNumber: number;
    questionText?: string;
    correctAnswer: string;
  }>;
}

export const bookingService = {
  // --- SUPPORT SESSIONS (30 PHÚT) ---
  getAvailableSlots: async (date: string): Promise<AvailableSlot[]> => {
    const res: any = await axiosClient.get(`/api/booking/support/slots?date=${date}`);
    return res.data || res;
  },

  bookSupportSession: async (data: {
    bookingDate: string;
    startTime: string;
    endTime?: string;
    skill: string;
    studentNote?: string;
    preferredTaId?: string;
  }): Promise<SupportBooking> => {
    const res: any = await axiosClient.post('/api/booking/support/book', data);
    return res.data || res;
  },

  getMyBookings: async (): Promise<SupportBooking[]> => {
    const res: any = await axiosClient.get('/api/booking/support/my-bookings');
    return res.data || res;
  },

  cancelBooking: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/booking/support/${id}/cancel`);
  },

  deleteBooking: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/booking/support/${id}`);
  },

  getTeachingAssistants: async (): Promise<any[]> => {
    const res: any = await axiosClient.get('/api/booking/support/teaching-assistants');
    return res.data || res;
  },

  // --- SỰ KIỆN & THI TEST TRỰC TIẾP ---
  getOpenEvents: async (): Promise<TestEvent[]> => {
    const res: any = await axiosClient.get('/api/booking/events/open');
    return res.data || res;
  },

  registerShift: async (data: {
    shiftId: number;
    fullName?: string;
    phone?: string;
    email?: string;
  }): Promise<TestEventRegistration> => {
    const res: any = await axiosClient.post('/api/booking/events/register', data);
    return res.data || res;
  },

  getMyRegistrations: async (): Promise<TestEventRegistration[]> => {
    const res: any = await axiosClient.get('/api/booking/events/my-registrations');
    return res.data || res;
  },

  cancelRegistration: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/booking/events/registrations/${id}/cancel`);
  },

  // --- ADMIN APIs ---
  getAllSupportBookingsAdmin: async (): Promise<SupportBooking[]> => {
    const res: any = await axiosClient.get('/api/admin/booking/support');
    return res.data || res;
  },

  cancelSupportBookingAdmin: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/admin/booking/support/${id}/cancel`);
  },

  deleteSupportBookingAdmin: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/admin/booking/support/${id}`);
  },

  evaluateSupportBookingAdmin: async (id: number, data: any): Promise<SupportBooking> => {
    const res: any = await axiosClient.put(`/api/admin/booking/support/${id}/evaluate`, data);
    return res.data || res;
  },

  getAllEventsAdmin: async (): Promise<TestEvent[]> => {
    const res: any = await axiosClient.get('/api/admin/booking/events');
    return res.data || res;
  },

  createEventAdmin: async (data: any): Promise<TestEvent> => {
    const res: any = await axiosClient.post('/api/admin/booking/events', data);
    return res.data || res;
  },

  updateEventAdmin: async (id: number, data: any): Promise<TestEvent> => {
    const res: any = await axiosClient.put(`/api/admin/booking/events/${id}`, data);
    return res.data || res;
  },

  deleteEventAdmin: async (id: number): Promise<any> => {
    return await axiosClient.delete(`/api/admin/booking/events/${id}`);
  },

  getShiftStudentsAdmin: async (shiftId: number): Promise<TestEventRegistration[]> => {
    const res: any = await axiosClient.get(`/api/admin/booking/events/shifts/${shiftId}/students`);
    return res.data || res;
  },

  updateStudentScoreAdmin: async (regId: number, data: any): Promise<TestEventRegistration> => {
    const res: any = await axiosClient.put(`/api/admin/booking/events/registrations/${regId}/score`, data);
    return res.data || res;
  },

  // --- ONLINE EXAM APIs (STUDENT) ---
  getExamAccessStatus: async (shiftId: number): Promise<ExamAccessStatus> => {
    const res: any = await axiosClient.get(`/api/booking/events/shifts/${shiftId}/access-status`);
    return res.data || res;
  },

  startExam: async (shiftId: number): Promise<StartExamResponse> => {
    const res: any = await axiosClient.post(`/api/booking/events/shifts/${shiftId}/start-exam`);
    return res.data || res;
  },

  submitExam: async (shiftId: number, answers: Record<string, string>): Promise<ExamSubmissionResult> => {
    const res: any = await axiosClient.post(`/api/booking/events/shifts/${shiftId}/submit-exam`, { answers });
    return res.data || res;
  },

  getMyExamResult: async (regId: number): Promise<ExamSubmissionResult> => {
    const res: any = await axiosClient.get(`/api/booking/events/registrations/${regId}/my-result`);
    return res.data || res;
  },

  // --- ONLINE EXAM APIs (ADMIN) ---
  saveExamConfigAdmin: async (eventId: number, data: EventExamConfig): Promise<TestEvent> => {
    const res: any = await axiosClient.put(`/api/admin/booking/events/${eventId}/exam-config`, data);
    return res.data || res;
  },

  getExamConfigAdmin: async (eventId: number): Promise<EventExamConfig> => {
    const res: any = await axiosClient.get(`/api/admin/booking/events/${eventId}/exam-config`);
    return res.data || res;
  },

  getEventRegistrationsAdmin: async (eventId: number): Promise<TestEventRegistration[]> => {
    const res: any = await axiosClient.get(`/api/admin/booking/events/${eventId}/registrations`);
    return res.data || res;
  },

  getRegistrationExamDetailAdmin: async (regId: number): Promise<ExamSubmissionResult> => {
    const res: any = await axiosClient.get(`/api/admin/booking/events/registrations/${regId}/detail`);
    return res.data || res;
  },

  resetMyExam: async (shiftId: number): Promise<{ message: string }> => {
    const res: any = await axiosClient.post(`/api/booking/events/shifts/${shiftId}/reset-my-exam`);
    return res.data || res;
  },

  resetRegistrationAdmin: async (regId: number): Promise<{ message: string }> => {
    const res: any = await axiosClient.post(`/api/admin/booking/events/registrations/${regId}/reset`);
    return res.data || res;
  },

  resetAllShiftRegistrationsAdmin: async (shiftId: number): Promise<{ message: string }> => {
    const res: any = await axiosClient.post(`/api/admin/booking/events/shifts/${shiftId}/reset-all`);
    return res.data || res;
  },

  // --- LEADERBOARD APIs ---
  getEventLeaderboard: async (eventId: number, shiftId?: number, skill?: string): Promise<EventLeaderboardData> => {
    const params: any = {};
    if (shiftId) params.shiftId = shiftId;
    if (skill) params.skill = skill;
    const res: any = await axiosClient.get(`/api/booking/events/${eventId}/leaderboard`, { params });
    return res.data || res;
  },

  toggleLeaderboardVisibilityAdmin: async (eventId: number, isPublic: boolean): Promise<{ message: string; isPublic: boolean }> => {
    const res: any = await axiosClient.put(`/api/admin/booking/events/${eventId}/leaderboard-toggle`, { isPublic });
    return res.data || res;
  },

  regradeAllAdmin: async (eventId: number): Promise<{ message: string; count: number }> => {
    const res: any = await axiosClient.post(`/api/admin/booking/events/${eventId}/regrade-all`);
    return res.data || res;
  },

  exportLeaderboardCsvAdmin: async (eventId: number, shiftId?: number): Promise<Blob> => {
    const params: any = {};
    if (shiftId) params.shiftId = shiftId;
    const res: any = await axiosClient.get(`/api/admin/booking/events/${eventId}/leaderboard/export-csv`, {
      params,
      responseType: 'blob'
    });
    return res.data || res;
  }
};
