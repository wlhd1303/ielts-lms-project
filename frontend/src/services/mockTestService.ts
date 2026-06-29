import axiosClient from './axiosClient';

export const mockTestService = {
  // --- HỌC VIÊN ---
  getTestsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/mock-tests/class/${classId}`);
  },
  getTestById: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}`);
  },
  // MỚI: Gọi api lấy câu hỏi hiển thị
  getQuestionsForStudent: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}/questions`);
  },
  submitTest: async (testId: number, answers: Record<number, string>, durationSeconds: number) => {
    return await axiosClient.post(`/api/mock-tests/${testId}/submit`, answers, {
      params: { duration: durationSeconds }
    });
  },

  // --- ADMIN ---
  createTest: async (classId: number, data: any) => {
    return await axiosClient.post(`/api/mock-tests/class/${classId}`, data);
  },
  deleteTest: async (testId: number) => {
    return await axiosClient.delete(`/api/mock-tests/${testId}`);
  },
  getAnswers: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}/answers`);
  },
  saveAnswerKey: async (testId: number, questions: any[]) => {
    return await axiosClient.post(`/api/mock-tests/${testId}/answers`, questions);
  }
};