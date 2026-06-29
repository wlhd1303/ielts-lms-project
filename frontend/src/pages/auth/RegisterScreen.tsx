import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', username: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Frontend: Kiểm tra mật khẩu khớp nhau
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp!');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Gọi API đăng ký, chỉ gửi username và password theo đúng cấu trúc của RegisterRequest bên Backend
      await authService.register({
        username: formData.username,
        password: formData.password
      });
      
      // Thành công thì hiện màn hình xanh báo chờ duyệt
      setIsSubmitted(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-600 to-blue-800 rounded-b-[4rem] shadow-lg opacity-90 transform -skew-y-2"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] p-10 overflow-hidden">
        
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Đăng ký</h2>
              <p className="text-sm text-gray-500 mt-2 font-medium">Gửi yêu cầu để Thầy Thành phê duyệt</p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <input type="text" name="fullName" onChange={handleChange} placeholder="Họ và tên" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none" required />
              </div>
              <div className="space-y-1">
                <input type="text" name="username" onChange={handleChange} placeholder="Tên đăng nhập" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none" required />
              </div>
              <div className="space-y-1">
                <input type="password" name="password" onChange={handleChange} placeholder="Mật khẩu" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none" required />
              </div>
              <div className="space-y-1">
                <input type="password" name="confirmPassword" onChange={handleChange} placeholder="Nhập lại mật khẩu" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none" required />
              </div>
              
              <button 
                disabled={isLoading}
                type="submit"
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/30 overflow-hidden mt-6"
              >
                {isLoading ? (
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    "Gửi yêu cầu"
                )}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Đã có tài khoản?{' '}
                <span onClick={() => navigate('/login')} className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                  Đăng nhập ngay
                </span>
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã gửi yêu cầu!</h2>
            <p className="text-gray-500 mb-8 font-medium">Vui lòng chờ Thầy Thành phê duyệt tài khoản của bạn nhé.</p>
            <button onClick={() => navigate('/login')} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all">
                Về trang đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterScreen;