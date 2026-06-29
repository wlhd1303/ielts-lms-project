import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SpeakingShadowing = () => {
  const navigate = useNavigate();
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'analyzing' | 'feedback'>('idle');

  // Dữ liệu mô phỏng bài luyện nói
  const lessonData = {
    progress: "Câu 2/10",
    topic: "Part 1: Hometown",
    targetSentence: "I grew up in a vibrant coastal city, which is famous for its breathtaking scenery and delicious seafood.",
    ipaTarget: "/aɪ ɡruː ʌp ɪn ə ˈvaɪbrənt ˈkoʊstl ˈsɪti, wɪtʃ ɪz ˈfeɪməs fɔːr ɪts ˈbreθteɪkɪŋ ˈsiːnəri ænd dɪˈlɪʃəs ˈsiːfuːd./"
  };

  // Xử lý logic nút thu âm
  const handleRecordClick = () => {
    if (recordingState === 'idle' || recordingState === 'feedback') {
      setRecordingState('recording');
    } else if (recordingState === 'recording') {
      setRecordingState('analyzing');
      // Giả lập thời gian AI phân tích giọng nói (2 giây)
      setTimeout(() => {
        setRecordingState('feedback');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">{lessonData.topic}</h1>
            <p className="text-xs text-orange-600 font-bold bg-orange-50 inline-block px-2 py-0.5 rounded-md mt-1">
              {lessonData.progress}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(249,_115,_22,_0.05)] border border-gray-100 overflow-hidden flex flex-col transition-all duration-500">
          
          {/* Khu vực Câu mẫu & Nghe giọng chuẩn */}
          <div className="p-8 md:p-10 border-b border-gray-100 bg-gradient-to-b from-orange-50/40 to-white relative">
            
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Câu cần luyện tập</h2>
               {/* Nút nghe giọng người bản xứ */}
               <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 Nghe mẫu
               </button>
            </div>

            <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-relaxed mb-4">
              "{lessonData.targetSentence}"
            </p>
            <p className="text-gray-400 font-mono text-sm tracking-wider">
              {lessonData.ipaTarget}
            </p>
          </div>

          {/* Khu vực Thu âm & Feedback */}
          <div className="p-8 md:p-12 flex flex-col items-center justify-center bg-white min-h-[300px] relative">
            
            {/* Trạng thái 1 & 2: Chờ thu âm hoặc Đang thu âm */}
            {(recordingState === 'idle' || recordingState === 'recording') && (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                {/* Vòng tròn sóng âm (Chỉ hiện khi đang thu âm) */}
                <div className="relative flex items-center justify-center w-32 h-32 mb-6">
                  {recordingState === 'recording' && (
                    <>
                      <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-20"></div>
                      <div className="absolute inset-2 bg-orange-300 rounded-full animate-ping opacity-40" style={{ animationDelay: '0.2s' }}></div>
                    </>
                  )}
                  
                  {/* Nút Microphone */}
                  <button 
                    onClick={handleRecordClick}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${recordingState === 'recording' ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/40' : 'bg-gradient-to-tr from-orange-500 to-orange-400 hover:scale-105 shadow-orange-500/30'}`}
                  >
                    {recordingState === 'recording' ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg> // Icon Stop
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> // Icon Mic
                    )}
                  </button>
                </div>
                
                <p className={`font-bold text-lg ${recordingState === 'recording' ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                  {recordingState === 'recording' ? 'Đang thu âm... Nhấn để dừng' : 'Nhấn để bắt đầu đọc'}
                </p>
              </div>
            )}

            {/* Trạng thái 3: Đang phân tích AI */}
            {recordingState === 'analyzing' && (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                <svg className="animate-spin w-12 h-12 text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="font-bold text-gray-600 text-lg">AI đang chấm điểm phát âm...</p>
              </div>
            )}

            {/* Trạng thái 4: Kết quả Feedback */}
            {recordingState === 'feedback' && (
              <div className="w-full animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phân tích phát âm (IPA)</h3>
                   <div className="bg-green-100 text-green-700 font-black px-4 py-1.5 rounded-xl text-lg">
                     85 / 100
                   </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 mb-6 leading-relaxed">
                  {/* Mô phỏng chữ đúng (xanh) và chữ sai (đỏ) */}
                  <span className="text-green-600 font-semibold text-lg mr-1">I grew up in a</span>
                  <span className="text-red-500 font-bold text-lg mr-1 border-b-2 border-red-500 cursor-pointer group relative">
                    vibrant
                    {/* Tooltip lỗi sai */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-lg">
                      Bạn đọc: /ˈvaɪbrən/ <br/> Chuẩn: /ˈvaɪbrənt/
                    </div>
                  </span>
                  <span className="text-green-600 font-semibold text-lg mr-1">coastal city, which is famous for its</span>
                  <span className="text-orange-500 font-bold text-lg mr-1 border-b-2 border-orange-500">breathtaking</span>
                  <span className="text-green-600 font-semibold text-lg">scenery and delicious seafood.</span>
                </div>

                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setRecordingState('idle')}
                    className="px-6 py-3 bg-white border-2 border-orange-200 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors"
                  >
                    Thử lại
                  </button>
                  <button className="px-8 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
                    Câu tiếp theo ➔
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
};

export default SpeakingShadowing;