import axios from 'axios';

// Khởi tạo một instance của axios với cấu hình linh hoạt
const axiosClient = axios.create({
  // Ưu tiên đọc URL Render khi live, nếu không có (chạy dưới local) sẽ dùng localhost:8080
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho Request: Tự động đính kèm Token nếu đã đăng nhập
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho Response: Xử lý lỗi và ÉP KIỂU DỮ LIỆU
axiosClient.interceptors.response.use(
  (response) => {
    let data = response.data;
    
    // ĐÂY LÀ DÒNG CHỐNG LỖI: Nếu dữ liệu bị vón cục thành String, rã nó ra thành Object
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Không thể parse dữ liệu JSON từ Backend", e);
      }
    }
    
    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;