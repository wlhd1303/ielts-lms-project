import axiosClient from './axiosClient';

export const adminService = {
  // --- QUẢN LÝ HỌC VIÊN & LỚP HỌC ---
  
  // Lấy danh sách tất cả học viên
  getAllUsers: async () => {
    return await axiosClient.get('/api/users');
  },

  // Lấy danh sách lớp học
  getAllClasses: async () => {
    return await axiosClient.get('/api/classes');
  },

  // API 1: Duyệt học viên mới (PENDING -> ACTIVE) kèm xếp lớp và cấp quyền
  approveStudent: async (userId: number, classId: number, features: string[]) => {
    return await axiosClient.put(`/api/users/${userId}/approve?classId=${classId}`, {
      features: features 
    });
  },

  // API 2: Cập nhật lại quyền cho học viên đã ACTIVE
  updatePermissions: async (userId: number, features: string[]) => {
    return await axiosClient.put(`/api/users/${userId}/permissions`, {
      features: features 
    });
  },

  // --- QUẢN LÝ TỪ VỰNG (CRUD) ---

  // Lấy danh sách chủ đề theo Lớp
  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/vocab/class/${classId}/topics`);
  },

  // Tạo chủ đề mới cho một Lớp
  createTopic: async (classId: number, name: string) => {
    return await axiosClient.post(`/api/vocab/class/${classId}/topics`, { name });
  },

  // Xóa chủ đề (và toàn bộ từ vựng bên trong)
  deleteTopic: async (topicId: number) => {
    return await axiosClient.delete(`/api/vocab/topics/${topicId}`);
  },

  // Lấy danh sách từ vựng của một Chủ đề
  getWordsByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/vocab/topics/${topicId}/words`);
  },

  // Thêm từ vựng mới vào Chủ đề
  createWord: async (topicId: number, wordData: any) => {
    return await axiosClient.post(`/api/vocab/topics/${topicId}/words`, wordData);
  },

  // Xóa một từ vựng
  deleteWord: async (wordId: number) => {
    return await axiosClient.delete(`/api/vocab/words/${wordId}`);
  },

  getRecentActivities: async () => {
    return await axiosClient.get('/api/study-records/recent');
  },

  // --- QUẢN LÝ NGHE CHÉP CHÍNH TẢ (DICTATION CRUD) ---
  getDictationTopicsByClass: async (classId: number) => await axiosClient.get(`/api/dictation/class/${classId}/topics`),
  createDictationTopic: async (classId: number, name: string) => await axiosClient.post(`/api/dictation/class/${classId}/topics`, { name }),
  deleteDictationTopic: async (topicId: number) => await axiosClient.delete(`/api/dictation/topics/${topicId}`),

  getDictationAudiosByTopic: async (topicId: number) => await axiosClient.get(`/api/dictation/topics/${topicId}/audios`),
  createDictationAudio: async (topicId: number, audioUrl: string) => await axiosClient.post(`/api/dictation/topics/${topicId}/audios`, { audioUrl }),
  deleteDictationAudio: async (audioId: number) => await axiosClient.delete(`/api/dictation/audios/${audioId}`),

  getDictationQuestionsByAudio: async (audioId: number) => await axiosClient.get(`/api/dictation/audios/${audioId}/questions`),
  createDictationQuestion: async (audioId: number, data: any) => await axiosClient.post(`/api/dictation/audios/${audioId}/questions`, data),
  deleteDictationQuestion: async (questionId: number) => await axiosClient.delete(`/api/dictation/questions/${questionId}`),

  getAllStudyRecords: async () => {
    return await axiosClient.get('/api/study-records/all');
  }
};