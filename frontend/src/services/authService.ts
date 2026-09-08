import axiosClient from './axiosClient';

export const authService = {
  login: async (data: any) => {
    sessionStorage.removeItem('cached_user_profile');
    return await axiosClient.post('/api/users/login', data);
  },

  register: async (data: any) => {
    return await axiosClient.post('/api/users/register', data);
  },

  // Lấy thông tin tài khoản đang đăng nhập (kèm bộ nhớ tạm 2 phút)
  getProfile: async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem('cached_user_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 120000) {
            return parsed.data;
          }
        }
      } catch (e) {}
    }

    const profileData = await axiosClient.get('/api/users/me');
    try {
      sessionStorage.setItem('cached_user_profile', JSON.stringify({
        data: profileData,
        timestamp: Date.now()
      }));
    } catch (e) {}
    return profileData;
  },

  // ⚡ Bổ sung: Cập nhật ngày thi mục tiêu của học viên
  updateTargetExamDate: async (examDate: string) => {
    sessionStorage.removeItem('cached_user_profile');
    return await axiosClient.put('/api/users/me/exam-date', { examDate });
  }
};