import axiosClient from './axiosClient';

export const mockTestService = {
  // --- HỌC VIÊN ---
  getTestsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/mock-tests/class/${classId}`);
  },
  getTestById: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}`);
  },
  getQuestionsForStudent: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}/questions`);
  },
  submitTest: async (testId: number, answers: Record<number, string>, durationSeconds: number) => {
    return await axiosClient.post(`/api/mock-tests/${testId}/submit`, answers, {
      params: { duration: durationSeconds }
    });
  },

  // ⚡ TÍNH NĂNG TỪ VỰNG READING
  saveExtractedVocabularies: async (testId: number, vocabList: { englishWord: string; vietnameseMeaning: string }[]) => {
    return await axiosClient.post(`/api/mock-tests/${testId}/vocabularies`, vocabList);
  },
  getPendingVocabularies: async () => {
    return await axiosClient.get('/api/mock-tests/pending-vocabularies');
  },
  submitVocabTest: async (score: number, durationSeconds: number) => {
    return await axiosClient.post('/api/mock-tests/submit-vocab-test', { score, durationSeconds });
  },

  // ⚡ MỚI BỔ SUNG: Lấy từ vựng review đích danh của bài Reading này
  getExtractedWordsByTestId: async (testId: number) => {
    return await axiosClient.get(`/api/mock-tests/${testId}/extracted-words`);
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