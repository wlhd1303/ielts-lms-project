import axiosClient from './axiosClient';

export const vocabService = {
  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/vocab/class/${classId}/topics`);
  },
  getWordsByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/vocab/topics/${topicId}/words`);
  },
  submitQuiz: async (topicId: number, answers: Record<number, string>, duration: number) => {
    return await axiosClient.post(`/api/vocab/${topicId}/submit?duration=${duration}`, answers);
  }
};