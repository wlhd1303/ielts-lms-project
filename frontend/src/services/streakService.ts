import axiosClient from './axiosClient';

export const streakService = {
  getTodayStreak: async () => {
    return await axiosClient.get('/api/streaks/today');
  },
  
  getAdminDashboard: async () => {
    return await axiosClient.get('/api/streaks/admin/dashboard');
  }
};