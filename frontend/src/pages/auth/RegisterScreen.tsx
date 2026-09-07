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
    setErrorMessage('');

    const trimmedFullName = formData.fullName.trim();
    const trimmedUsername = formData.username.trim();

    if (!trimmedFullName) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{4,30}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorMessage('Tên đăng nhập phải từ 4-30 ký tự, chỉ gồm chữ cái không dấu, số và dấu gạch dưới (_).');
      return;
    }

    if (formData.password.length < 8 || formData.password.length > 32) {
      setErrorMessage('Mật khẩu phải có độ dài từ 8 đến 32 ký tự.');
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)\S+$/;
    if (!passwordRegex.test(formData.password)) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 1 chữ cái, 1 chữ số và không chứa khoảng trắng.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        fullName: trimmedFullName,
        username: trimmedUsername,
        password: formData.password
      });
      setIsSubmitted(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Tên đăng nhập đã tồn tại hoặc không hợp lệ.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasMinLength = formData.password.length >= 8 && formData.password.length <= 32;
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasNoSpace = formData.password.length > 0 && !/\s/.test(formData.password);

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
      {/* Background Decor Ambient */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10 backdrop-blur-md">
        
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-3 shadow-inner">
                ✍️
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Đăng ký Tài khoản</h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">Gửi thông tin tham gia lớp học IELTS Thầy Thành</p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/60 rounded-2xl text-rose-700 text-xs font-bold text-center">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={formData.fullName}
                  onChange={handleChange} 
                  placeholder="Ví dụ: Nguyễn Văn A" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all" 
                  required 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tên đăng nhập</label>
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username}
                  onChange={handleChange} 
                  placeholder="student2026" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all" 
                  required 
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1">4-30 ký tự, chữ không dấu, số hoặc gạch dưới (_)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Mật khẩu</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={formData.password}
                    onChange={handleChange} 
                    placeholder="••••••••" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Nhập lại MK</label>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    value={formData.confirmPassword}
                    onChange={handleChange} 
                    placeholder="••••••••" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all" 
                    required 
                  />
                </div>
              </div>

              {/* Password requirement badges */}
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Yêu cầu mật khẩu:</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span className={hasMinLength ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                    {hasMinLength ? "✓" : "•"} 8 - 32 ký tự
                  </span>
                  <span className={hasLetter ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                    {hasLetter ? "✓" : "•"} Chứa ít nhất 1 chữ cái
                  </span>
                  <span className={hasNumber ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                    {hasNumber ? "✓" : "•"} Chứa ít nhất 1 chữ số
                  </span>
                  <span className={hasNoSpace ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                    {hasNoSpace ? "✓" : "•"} Không có khoảng trắng
                  </span>
                </div>
              </div>
              
              <button 
                disabled={isLoading}
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] mt-2 flex items-center justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Gửi Yêu Cầu Duyệt"
                )}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 font-semibold">
                Đã có tài khoản?{' '}
                <span onClick={() => navigate('/login')} className="text-blue-600 hover:underline font-extrabold cursor-pointer">
                  Đăng nhập
                </span>
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✓
            </div>
            <h2 className="text-xl font-black text-slate-900">Yêu cầu đã được gửi!</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Tài khoản của bạn đã được ghi nhận. Vui lòng liên hệ Thầy Thành để kích hoạt xếp lớp nhé.
            </p>
            <button 
              onClick={() => navigate('/login')} 
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md hover:bg-slate-800 transition-all active:scale-95"
            >
              ← Về trang đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterScreen;