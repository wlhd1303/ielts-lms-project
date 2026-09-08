import axiosClient from './axiosClient';

export const writingService = {
  // Quản lý Topics
  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/writing/class/${classId}/topics`);
  },
  createTopic: async (classId: number, name: string) => {
    return await axiosClient.post(`/api/writing/class/${classId}/topics`, { name });
  },
  deleteTopic: async (topicId: number) => {
    return await axiosClient.delete(`/api/writing/topics/${topicId}`);
  },

  // Quản lý Prompts theo Topic
  getPromptsByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/writing/topics/${topicId}/prompts`);
  },
  getPromptById: async (promptId: number) => {
    return await axiosClient.get(`/api/writing/prompts/${promptId}`);
  },
  createPrompt: async (topicId: number, data: any) => {
    return await axiosClient.post(`/api/writing/topics/${topicId}/prompts`, data);
  },
  deletePrompt: async (promptId: number) => {
    return await axiosClient.delete(`/api/writing/prompts/${promptId}`);
  },

  // Nộp bài
  submitWriting: async (promptId: number, answer: string, durationSeconds: number) => {
    return await axiosClient.post(`/api/writing/${promptId}/submit?duration=${durationSeconds}`, { answer });
  }
};