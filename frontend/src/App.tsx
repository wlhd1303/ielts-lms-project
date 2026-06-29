import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterScreen from './pages/auth/RegisterScreen';
// Import Màn hình chung
import LoginScreen from './pages/auth/LoginScreen';

// Import Màn hình Học viên
import StudentDashboard from './pages/dashboard/StudentDashboard';
import LeaderboardScreen from './pages/dashboard/LeaderboardScreen';
import MockTestSplitScreen from './pages/mock-test/MockTestSplitScreen';
import DictationPlayer from './pages/dictation/DictationPlayer';
import WritingEditor from './pages/writing/WritingEditor';
import VocabularyQuiz from './pages/vocabulary/VocabularyQuiz';
import SpeakingShadowing from './pages/speaking/SpeakingShadowing';
import MockTestList from './pages/mock-test/MockTestList';
// Import Màn hình Admin (Mới thêm)
import AdminDashboard from './pages/admin/AdminDashboard';

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
        <Route path="/speaking" element={<SpeakingShadowing />} />
        
        {/* Routes Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Route 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-6xl font-black text-gray-300 mb-4">404</h1>
            <p className="text-xl text-gray-500 font-medium">Lạc đường rồi!</p>
            <a href="/login" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors">
              Quay lại Trang chủ
            </a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;