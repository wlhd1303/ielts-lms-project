import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import PageLoader from './components/ui/PageLoader';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Dynamic Import (Code-Splitting) giúp giảm kích thước bundle ban đầu và tăng tốc load web
const RegisterScreen = lazy(() => import('./pages/auth/RegisterScreen'));
const LoginScreen = lazy(() => import('./pages/auth/LoginScreen'));

// Import Màn hình Học viên (Lazy)
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard'));
const LeaderboardScreen = lazy(() => import('./pages/dashboard/LeaderboardScreen'));
const MockTestSplitScreen = lazy(() => import('./pages/mock-test/MockTestSplitScreen'));
const DictationPlayer = lazy(() => import('./pages/dictation/DictationPlayer'));
const WritingEditor = lazy(() => import('./pages/writing/WritingEditor'));
const VocabularyQuiz = lazy(() => import('./pages/vocabulary/VocabularyQuiz'));

// Phân hệ Vocablis & Speaking (Lazy)
const ListeningVocabList = lazy(() => import('./pages/vocablis/ListeningVocabList'));
const ListeningVocabTest = lazy(() => import('./pages/vocablis/ListeningVocabTest'));
const VocabReviewTest = lazy(() => import('./pages/vocablis/VocabReviewTest'));
const SpeakingShadowing = lazy(() => import('./pages/speaking/SpeakingShadowing'));
const MockTestList = lazy(() => import('./pages/mock-test/MockTestList'));

// Import Màn hình Admin (Lazy)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Giải mã role trực tiếp từ JWT Token để tránh sai lệch localStorage hoặc cache
const getRoleFromToken = (token: string | null): string => {
  if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') return '';
  try {
    const parts = token.split('.');
    if (parts.length < 2) return '';
    const base64Url = parts[1];
    if (!base64Url) return '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return (parsed.role || '').toUpperCase().trim();
  } catch {
    return '';
  }
};

// Kiểm tra quyền Admin
const checkIsAdmin = (): boolean => {
  const token = localStorage.getItem('token');
  const localRole = (localStorage.getItem('role') || '').toUpperCase().trim();
  const tokenRole = getRoleFromToken(token);
  return (
    tokenRole === 'ROLE_ADMIN' ||
    tokenRole === 'ADMIN' ||
    localRole === 'ROLE_ADMIN' ||
    localRole === 'ADMIN'
  );
};

// Route Guard chỉ cho phép ROLE_ADMIN truy cập
const AdminRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null') {
    return <Navigate to="/login" replace />;
  }
  if (!checkIsAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Route Guard cho Học viên: Chưa đăng nhập chuyển về /login, Admin tự chuyển sang /admin
const StudentRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null') {
    return <Navigate to="/login" replace />;
  }
  if (checkIsAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

// Public Route: Nếu đã đăng nhập thì tự chuyển thẳng vào đúng Portal
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    return checkIsAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterScreen /></PublicRoute>} />
            
            {/* Routes Học viên (được bảo vệ toàn diện bằng StudentRoute) */}
            <Route path="/dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
            <Route path="/leaderboard" element={<StudentRoute><LeaderboardScreen /></StudentRoute>} />
            <Route path="/mock-test" element={<StudentRoute><MockTestList /></StudentRoute>} />
            <Route path="/mock-test/:id" element={<StudentRoute><MockTestSplitScreen /></StudentRoute>} />
            <Route path="/dictation" element={<StudentRoute><DictationPlayer /></StudentRoute>} />
            <Route path="/writing" element={<StudentRoute><WritingEditor /></StudentRoute>} />
            <Route path="/vocabulary" element={<StudentRoute><VocabularyQuiz /></StudentRoute>} />
            
            {/* Route Listening Vocab độc lập */}
            <Route path="/listening-vocab" element={<StudentRoute><ListeningVocabList /></StudentRoute>} />
            <Route path="/listening-vocab/:topicId" element={<StudentRoute><ListeningVocabTest /></StudentRoute>} />
            
            {/* Route Review 35 từ vựng riêng của bài Reading/Mock Test để tính Streak */}
            <Route path="/vocab-review/:id" element={<StudentRoute><VocabReviewTest /></StudentRoute>} />
            
            <Route path="/speaking" element={<StudentRoute><SpeakingShadowing /></StudentRoute>} />
            
            {/* Routes Admin (đã bảo vệ bằng AdminRoute) */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            
            {/* Route 404 (chuẩn SPA Link) */}
            <Route path="*" element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
                <h1 className="text-6xl font-black text-slate-700 mb-4">404</h1>
                <p className="text-xl text-slate-400 font-medium">Lạc đường rồi!</p>
                <Link to="/login" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-colors">
                  Quay lại Trang chủ
                </Link>
              </div>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;