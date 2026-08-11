import axiosClient from './axiosClient';

export const speakingService = {
  getLessonsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/speaking/class/${classId}`);
  },
  submitScore: async (lessonId: number, score: number, durationSeconds: number) => {
    return await axiosClient.post(`/api/speaking/${lessonId}/submit?duration=${durationSeconds}`, {
      score: score
    });
  }
};