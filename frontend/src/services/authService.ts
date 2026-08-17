import axiosClient from './axiosClient';

export const authService = {
  login: async (data: any) => {
    return await axiosClient.post('/api/users/login', data);
  },

  register: async (data: any) => {
    return await axiosClient.post('/api/users/register', data);
  },

  // Lấy thông tin tài khoản đang đăng nhập
  getProfile: async () => {
    return await axiosClient.get('/api/users/me');
  },

  // ⚡ Bổ sung: Cập nhật ngày thi mục tiêu của học viên
  updateTargetExamDate: async (examDate: string) => {
    return await axiosClient.put('/api/users/me/exam-date', { examDate });
  }
};