import axiosClient from './axiosClient';

export const speakingService = {
  // --- QUẢN LÝ CHỦ ĐỀ & CÂU LUYỆN NÓI MỚI ---
  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/speaking/class/${classId}/topics`);
  },

  getSentencesByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/speaking/topics/${topicId}/sentences`);
  },

  submitSentenceScore: async (sentenceId: number, score: number, durationSeconds: number, transcript?: string) => {
    return await axiosClient.post(`/api/speaking/sentences/${sentenceId}/submit?duration=${durationSeconds}`, {
      score: score,
      transcript: transcript || ''
    });
  },

  // --- HÀM CŨ CHO BÀI HỌC ĐƠN LẺ (GIỮ TƯƠNG THÍCH) ---
  getLessonsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/speaking/class/${classId}`);
  },

  submitScore: async (lessonId: number, score: number, durationSeconds: number, transcript?: string) => {
    return await axiosClient.post(`/api/speaking/${lessonId}/submit?duration=${durationSeconds}`, {
      score: score,
      transcript: transcript || ''
    });
  }
};