import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterScreen from './pages/auth/RegisterScreen';
import LoginScreen from './pages/auth/LoginScreen';

// Import Màn hình Học viên
import StudentDashboard from './pages/dashboard/StudentDashboard';
import LeaderboardScreen from './pages/dashboard/LeaderboardScreen';
import MockTestSplitScreen from './pages/mock-test/MockTestSplitScreen';
import DictationPlayer from './pages/dictation/DictationPlayer';
import WritingEditor from './pages/writing/WritingEditor';
import VocabularyQuiz from './pages/vocabulary/VocabularyQuiz';

// Import các màn hình thuộc phân hệ vocablis
import ListeningVocabList from './pages/vocablis/ListeningVocabList';
import ListeningVocabTest from './pages/vocablis/ListeningVocabTest';
import VocabReviewTest from './pages/vocablis/VocabReviewTest'; 
import SpeakingShadowing from './pages/speaking/SpeakingShadowing';
import MockTestList from './pages/mock-test/MockTestList';

// Import Màn hình Admin
import AdminDashboard from './pages/admin/AdminDashboard';

// Giải mã role trực tiếp từ JWT Token để tránh sai lệch localStorage hoặc cache
const getRoleFromToken = (token: string | null): string => {
  if (!token) return '';
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return (parsed.role || '').toUpperCase().trim();
  } catch (e) {
    return '';
  }
};

// Route Guard chỉ cho phép ROLE_ADMIN truy cập
const AdminRoute = ({ children }: { children: React.ReactElement }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const tokenRole = getRoleFromToken(token);
  const localRole = (localStorage.getItem('role') || '').toUpperCase().trim();
  const role = tokenRole || localRole;
  const isAdmin = role === 'ROLE_ADMIN' || role === 'ADMIN';

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        
        {/* Routes Học viên */}
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/mock-test" element={<MockTestList />} />
        <Route path="/mock-test/:id" element={<MockTestSplitScreen />} />
        <Route path="/dictation" element={<DictationPlayer />} />
        <Route path="/writing" element={<WritingEditor />} />
        <Route path="/vocabulary" element={<VocabularyQuiz />} />
        
        {/* Route Listening Vocab độc lập */}
        <Route path="/listening-vocab" element={<ListeningVocabList />} />
        <Route path="/listening-vocab/:topicId" element={<ListeningVocabTest />} />
        
        {/* ⚡ Route Review 35 từ vựng riêng của bài Reading/Mock Test để tính Streak */}
        <Route path="/vocab-review/:id" element={<VocabReviewTest />} />
        
        <Route path="/speaking" element={<SpeakingShadowing />} />
        
        {/* Routes Admin (đã bảo vệ bằng AdminRoute) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        
        {/* Route 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
            <h1 className="text-6xl font-black text-slate-700 mb-4">404</h1>
            <p className="text-xl text-slate-400 font-medium">Lạc đường rồi!</p>
            <a href="/login" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-colors">
              Quay lại Trang chủ
            </a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;