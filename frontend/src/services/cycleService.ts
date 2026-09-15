import axiosClient from './axiosClient';

export interface StudyCyclePayload {
  cycleOrder?: number;
  cycleType?: string; // "READING" hoặc "LISTENING"
  title?: string;
  mockTestId?: number | null;
  vocabTopicId?: number | null;
  dictationAudioId?: number | null;
  speakingTopicId?: number | null;
  writingTopicId?: number | null;
  isActive?: boolean;
}

export const cycleService = {
  // Lấy danh sách Vòng của lớp (Admin)
  getCyclesByClass: async (classId: number) => {
    return await axiosClient.get(`/api/cycles/class/${classId}`);
  },

  // Lấy chi tiết 1 Vòng
  getCycleById: async (cycleId: number) => {
    return await axiosClient.get(`/api/cycles/${cycleId}`);
  },

  // Tạo mới Vòng
  createCycle: async (classId: number, data: StudyCyclePayload) => {
    return await axiosClient.post(`/api/cycles/class/${classId}`, data);
  },

  // Cập nhật Vòng
  updateCycle: async (cycleId: number, data: StudyCyclePayload) => {
    return await axiosClient.put(`/api/cycles/${cycleId}`, data);
  },

  // Xóa Vòng
  deleteCycle: async (cycleId: number) => {
    return await axiosClient.delete(`/api/cycles/${cycleId}`);
  },

  // ⚡ Tự động tạo chuỗi Vòng xen kẽ từ dữ liệu sẵn có của lớp
  autoGenerateCycles: async (classId: number) => {
    return await axiosClient.post(`/api/cycles/class/${classId}/auto-generate`);
  },

  // Học viên: Lấy danh sách các Vòng của lớp mình
  getMyClassCycles: async () => {
    return await axiosClient.get('/api/cycles/my-class');
  }
};
