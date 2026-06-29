import axiosClient from './axiosClient';

export const writingService = {
  getPromptsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/writing/class/${classId}`);
  },
  createPrompt: async (classId: number, data: any) => {
    return await axiosClient.post(`/api/writing/class/${classId}`, data);
  },
  deletePrompt: async (promptId: number) => {
    return await axiosClient.delete(`/api/writing/${promptId}`);
  },
  submitWriting: async (promptId: number, answer: string, durationSeconds: number) => {
    return await axiosClient.post(`/api/writing/${promptId}/submit?duration=${durationSeconds}`, { answer });
  }
};