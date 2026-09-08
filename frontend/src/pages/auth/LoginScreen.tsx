import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const LoginScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const response: any = await authService.login({
        username: trimmedUsername,
        password: formData.password
      });
      const rawRole = (response.role || '').toUpperCase().trim();
      const isAdmin = rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN';
      const normalizedRole = isAdmin ? 'ROLE_ADMIN' : 'ROLE_USER';

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('role', normalizedRole);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10">
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-3 shadow-lg shadow-blue-500/20">
            T
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">IELTS LMS PORTAL</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">Hệ thống Luyện thi & Chấm điểm IELTS Thầy Thành</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-xs font-bold text-center">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tên đăng nhập</label>
            <input
              type="text"
              name="username"
              placeholder="Nhập tên đăng nhập..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Mật khẩu</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all tracking-widest"
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] mt-2 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Đăng Nhập Vào Học"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400 font-semibold">
            Chưa có tài khoản?{' '}
            <span onClick={() => navigate('/register')} className="text-blue-600 hover:underline font-extrabold cursor-pointer">
              Đăng ký xét duyệt
            </span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;