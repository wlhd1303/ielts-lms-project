import axiosClient from './axiosClient';

export const authService = {
  login: async (data: any) => {
    return await axiosClient.post('/api/users/login', data);
  },

  register: async (data: any) => {
    return await axiosClient.post('/api/users/register', data);
  },

  // Hàm mới thêm: Lấy thông tin tài khoản đang đăng nhập
  getProfile: async () => {
    return await axiosClient.get('/api/users/me');
  }
};