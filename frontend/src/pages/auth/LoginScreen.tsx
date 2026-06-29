import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService'; // Import service gọi API

const LoginScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage(''); // Xóa lỗi khi người dùng bắt đầu gõ lại
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Gọi API xuống Spring Boot
      const response: any = await authService.login(formData);
      
      // Thành công: Lưu accessToken vào localStorage
      localStorage.setItem('token', response.accessToken);
      
      // Kiểm tra Role để phân luồng (Lấy từ AuthResponse)
      if (response.role === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      // Bắt lỗi từ Backend (Sai mật khẩu, không tìm thấy tài khoản...)
      setErrorMessage(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-600 to-blue-800 rounded-b-[4rem] shadow-lg opacity-90 transform -skew-y-2"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] p-10 overflow-hidden">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">IELTS LMS</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">Nền tảng học thuật Thầy Thành</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 ml-1">Tên đăng nhập</label>
            <input
              type="text"
              name="username"
              placeholder="Ví dụ: student2026"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all duration-300"
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-1 relative">
            <label className="text-sm font-semibold text-gray-700 ml-1">Mật khẩu</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all duration-300 tracking-widest"
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-600/30 overflow-hidden"
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Vào Lớp Học"
            )}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <span 
              onClick={() => navigate('/register')} 
              className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Đăng ký ngay
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;