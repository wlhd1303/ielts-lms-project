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
  status: 'REGISTERED' | 'ATTENDED' | 'ABSENT' | 'CANCELLED';
  scoreListening?: number;
  scoreReading?: number;
  scoreWriting?: number;
  scoreSpeaking?: number;
  overallScore?: number;
  feedback?: string;
  registeredAt?: string;
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
  }
};
