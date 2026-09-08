import axios from 'axios';

// Làm sạch và chuẩn hóa backendUrl: tự động bóc tách nếu biến môi trường bị dính cú pháp markdown [url](url)
const cleanApiUrl = (): string => {
  let envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl.includes('](')) {
    const match = envUrl.match(/\((https?:\/\/[^\)]+)\)/);
    if (match) envUrl = match[1];
  } else if (envUrl.startsWith('[') && envUrl.endsWith(']')) {
    envUrl = envUrl.slice(1, -1);
  }
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    return envUrl.replace(/\/+$/, '');
  }
  return import.meta.env.PROD ? 'https://ielts-lms-project.onrender.com' : 'http://localhost:8080';
};

const backendUrl = cleanApiUrl();

// Khởi tạo instance của axios
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
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor cho Response: Xử lý dữ liệu & Tự động Refresh Token khi gặp lỗi 401
axiosClient.interceptors.response.use(
  (response) => {
    let data = response.data;
    
    // BƯỚC FIX LỖI: Chỉ thực hiện parse nếu chuỗi có nội dung thực sự
    if (typeof data === 'string' && data.trim() !== '') {
      // Nếu Backend hoặc Render trả về trang HTML (ví dụ server đang khởi động lại hoặc 404/502)
      if (data.startsWith('<!doctype') || data.startsWith('<!DOCTYPE') || data.startsWith('<html')) {
        console.warn("Cảnh báo: Backend trả về trang HTML thay vì JSON. Có thể server Render đang khởi động.");
        return [];
      }
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Không thể parse dữ liệu JSON từ Backend", e);
      }
    } else if (typeof data === 'string' && data.trim() === '') {
      data = {};
    }
    
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và không phải request đăng nhập/refresh
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/api/users/login') && 
      !originalRequest.url?.includes('/api/users/refresh')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${backendUrl}/api/users/refresh`, { refreshToken });
        const data = res.data?.data || res.data;
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        localStorage.setItem('token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;