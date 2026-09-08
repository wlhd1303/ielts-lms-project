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

  // Admin tạo lớp học mới
  createClass: async (className: string) => {
    return await axiosClient.post('/api/users/classes', { name: className });
  },

  // Admin cập nhật lớp học của học viên
  updateStudentClass: async (userId: number, classId: number) => {
    return await axiosClient.put(`/api/users/${userId}/class`, { classId: classId });
  },

  // Duyệt học viên mới (PENDING -> ACTIVE) kèm xếp lớp và cấp quyền
  approveStudent: async (userId: number, classId: number, features: string[]) => {
    return await axiosClient.put(`/api/users/${userId}/approve?classId=${classId}`, {
      features: features 
    });
  },

  // Cập nhật lại quyền cho học viên đã ACTIVE
  updatePermissions: async (userId: number, features: string[]) => {
    return await axiosClient.put(`/api/users/${userId}/permissions`, {
      features: features 
    });
  },

  // --- QUẢN LÝ TỪ VỰNG (VOCAB CRUD) ---

  getTopicsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/vocab/class/${classId}/topics`);
  },

  createTopic: async (classId: number, name: string) => {
    return await axiosClient.post(`/api/vocab/class/${classId}/topics`, { name });
  },

  deleteTopic: async (topicId: number) => {
    return await axiosClient.delete(`/api/vocab/topics/${topicId}`);
  },

  getWordsByTopic: async (topicId: number) => {
    return await axiosClient.get(`/api/vocab/topics/${topicId}/words`);
  },

  createWord: async (topicId: number, wordData: any) => {
    return await axiosClient.post(`/api/vocab/topics/${topicId}/words`, wordData);
  },

  deleteWord: async (wordId: number) => {
    return await axiosClient.delete(`/api/vocab/words/${wordId}`);
  },

  // --- QUẢN LÝ SPEAKING (CRUD) ---

  getSpeakingLessonsByClass: async (classId: number) => {
    return await axiosClient.get(`/api/speaking/class/${classId}`);
  },

  createSpeakingLesson: async (classId: number, data: { title: string; content: string }) => {
    return await axiosClient.post(`/api/speaking/class/${classId}`, data);
  },

  deleteSpeakingLesson: async (lessonId: number) => {
    return await axiosClient.delete(`/api/speaking/${lessonId}`);
  },

  // --- QUẢN LÝ NHẬT KÝ & BÁO CÁO ---

  getRecentActivities: async () => {
    return await axiosClient.get('/api/study-records/recent');
  },

  getMyRecords: async () => {
    return await axiosClient.get('/api/study-records/my-records');
  },

  getAllStudyRecords: async () => {
    return await axiosClient.get('/api/study-records/all');
  },

  // --- QUẢN LÝ NGHE CHÉP CHÍNH TẢ (DICTATION CRUD) ---

  getDictationTopicsByClass: async (classId: number) => 
    await axiosClient.get(`/api/dictation/class/${classId}/topics`),

  createDictationTopic: async (classId: number, name: string) => 
    await axiosClient.post(`/api/dictation/class/${classId}/topics`, { name }),

  deleteDictationTopic: async (topicId: number) => 
    await axiosClient.delete(`/api/dictation/topics/${topicId}`),

  getDictationAudiosByTopic: async (topicId: number) => 
    await axiosClient.get(`/api/dictation/topics/${topicId}/audios`),

  createDictationAudio: async (topicId: number, audioUrl: string) => 
    await axiosClient.post(`/api/dictation/topics/${topicId}/audios`, { audioUrl }),

  deleteDictationAudio: async (audioId: number) => 
    await axiosClient.delete(`/api/dictation/audios/${audioId}`),

  getDictationQuestionsByAudio: async (audioId: number) => 
    await axiosClient.get(`/api/dictation/audios/${audioId}/questions`),

  createDictationQuestion: async (audioId: number, data: any) => 
    await axiosClient.post(`/api/dictation/audios/${audioId}/questions`, data),

  deleteDictationQuestion: async (questionId: number) => 
    await axiosClient.delete(`/api/dictation/questions/${questionId}`),

  // --- QUẢN LÝ LUYỆN NÓI (SPEAKING CRUD) ---
  getSpeakingTopicsByClass: async (classId: number) => 
    await axiosClient.get(`/api/speaking/class/${classId}/topics`),

  createSpeakingTopic: async (classId: number, name: string) => 
    await axiosClient.post(`/api/speaking/class/${classId}/topics`, { name }),

  deleteSpeakingTopic: async (topicId: number) => 
    await axiosClient.delete(`/api/speaking/topics/${topicId}`),

  getSpeakingSentencesByTopic: async (topicId: number) => 
    await axiosClient.get(`/api/speaking/topics/${topicId}/sentences`),

  createSpeakingSentence: async (topicId: number, data: { englishSentence: string; vietnameseMeaning?: string; orderIndex?: number }) => 
    await axiosClient.post(`/api/speaking/topics/${topicId}/sentences`, data),

  deleteSpeakingSentence: async (sentenceId: number) => 
    await axiosClient.delete(`/api/speaking/sentences/${sentenceId}`)
};