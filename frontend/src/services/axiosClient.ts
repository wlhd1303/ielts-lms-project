import axios from 'axios';

// BƯỚC FIX LỖI: Kiểm tra và làm sạch URL backend
let backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Nếu vì lý do nào đó Render truyền vào chuỗi trống hoặc không hợp lệ, ép về localhost khi dev
if (!backendUrl || backendUrl.trim() === '' || backendUrl === 'undefined') {
  backendUrl = 'http://localhost:8080';
}

// Khởi tạo một instance của axios với cấu hình linh hoạt
const axiosClient = axios.create({
  baseURL: backendUrl,
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
    
    // BƯỚC FIX LỖI: Chỉ thực hiện parse nếu chuỗi có nội dung thực sự
    if (typeof data === 'string' && data.trim() !== '') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Không thể parse dữ liệu JSON từ Backend", e);
      }
    } else if (typeof data === 'string' && data.trim() === '') {
      // Nếu Backend trả về chuỗi trống (Empty Response Body khi tạo mới/đăng ký thành công)
      // Ép về object rỗng để hàm gọi API phía sau không bị crash JSON.parse
      data = {};
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