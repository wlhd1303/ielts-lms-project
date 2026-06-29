import axiosClient from './axiosClient';

export const dictationService = {
  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/dictation/class/${classId}/topics`);
  },
  getAudiosByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/dictation/topics/${topicId}/audios`);
  },
  getQuestionsByAudio: async (audioId: number) => {
    return await axiosClient.get(`/api/dictation/audios/${audioId}/questions`);
  },
  
  // Truyền nguyên mảng câu trả lời xuống cho Backend chấm
  submitDictation: async (audioId: number, payload: Record<number, string>, duration: number) => {
    return await axiosClient.post(`/api/dictation/${audioId}/submit?duration=${duration}`, payload);
  }
};