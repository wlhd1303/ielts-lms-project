import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockTestService } from '../../services/mockTestService';

const MockTestSplitScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const testId = Number(id);

  const [activeTab, setActiveTab] = useState<'pdf' | 'answers'>('pdf'); 
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // STATE LƯU TRỮ TEXT CÂU HỎI
  const [questionTexts, setQuestionTexts] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [resultRecord, setResultRecord] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); 

  const [testDetails, setTestDetails] = useState({
    title: "Đang tải...", type: "READING", pdf_url: "", audio_url: ""
  });

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const service = mockTestService as any;
        const data: any = await service.getTestById(testId);
        setTestDetails({
          title: data.title, type: data.type, pdf_url: data.pdfUrl || "", audio_url: data.audioUrl || ""
        });

        // GỌI API KÉO TEXT CÂU HỎI (Đã ẩn đáp án)
        const qRes: any = await service.getQuestionsForStudent(testId);
        const qData = Array.isArray(qRes) ? qRes : qRes.data || [];
        const qMap: Record<number, string> = {};
        qData.forEach((q: any) => {
            qMap[q.questionNumber || q.question_number] = q.questionText || q.question_text || '';
        });
        setQuestionTexts(qMap);

      } catch (error) {
        console.error("Lỗi lấy thông tin đề thi", error);
      }
    };
    fetchTestDetails();
  }, [testId]);

  useEffect(() => {
    if (timeLeft <= 0 || resultRecord) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, resultRecord]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionNumber: number, value: string) => {
    if (resultRecord) return;
    setAnswers({ ...answers, [questionNumber]: value });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) return alert("Bạn chưa điền đáp án nào!");
    if (!window.confirm("Xác nhận nộp bài?")) return;

    setIsLoading(true);
    try {
      const durationSeconds = 3600 - timeLeft;
      const response: any = await mockTestService.submitTest(testId, answers, durationSeconds);
      setResultRecord(response);
    } catch (error) {
      alert("Lỗi nộp bài!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-slate-50">
      
      {/* --- HEADER --- */}
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-20 shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/mock-test')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
             <span className="text-xl">⬅️</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800">{testDetails.title}</h1>
        </div>
        <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold font-mono text-lg shadow-sm border border-red-100">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* --- VÙNG CHIA ĐÔI MÀN HÌNH --- */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Cột trái: Đề bài */}
        <div className={`w-full md:w-1/2 h-full p-4 transition-all duration-300 ${activeTab === 'pdf' ? 'block' : 'hidden md:block'}`}>
          <div className="w-full h-full bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-600 text-sm uppercase flex justify-between">
              <span>Đề Thi ({testDetails.type})</span>
            </div>
            
            <div className="flex-1 bg-gray-100 relative">
              {testDetails.type === 'READING' && testDetails.pdf_url ? (
                <iframe src={testDetails.pdf_url} className="w-full h-full border-none" title="Reading PDF" />
              ) : testDetails.type === 'LISTENING' ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">🎧</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Phần thi Listening</h2>
                  {testDetails.audio_url ? (
                    <audio controls className="w-full max-w-md shadow-md rounded-full">
                       <source src={testDetails.audio_url} type="audio/mpeg" />
                       Trình duyệt không hỗ trợ Audio.
                    </audio>
                  ) : (
                    <p className="text-gray-400 font-medium">Đang tải file âm thanh...</p>
                  )}
                  <p className="mt-8 text-sm text-red-500 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                    Lưu ý: Bạn chỉ được nghe 1 lần duy nhất trong kỳ thi thật!
                  </p>
                </div>
              ) : (
                 <div className="flex items-center justify-center h-full text-gray-400 font-medium">Đang tải cấu trúc đề...</div>
              )}
            </div>

          </div>
        </div>

        {/* Cột phải: Phiếu làm bài */}
        <div className={`w-full md:w-1/2 h-full p-4 transition-all duration-300 ${activeTab === 'answers' ? 'block' : 'hidden md:block'}`}>
          <div className="w-full h-full bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
             {!resultRecord ? (
               <>
                 <div className="px-5 py-3 bg-blue-600 font-semibold text-white text-sm uppercase shadow-sm">
                   Phiếu Trả Lời
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Render tự động 40 câu */}
                    {[...Array(40)].map((_, i) => {
                      const num = i + 1;
                      const qText = questionTexts[num];
                      
                      return (
                        <div key={num} className="flex flex-col bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                          {/* HIỂN THỊ TEXT CÂU HỎI VÀO ĐÂY NẾU CÓ */}
                          {qText && (
                            <p className="text-sm text-gray-700 font-semibold mb-3 leading-relaxed border-l-2 border-blue-400 pl-3 bg-blue-50/30 py-2 rounded-r-lg">
                              {qText}
                            </p>
                          )}
                          <div className="flex items-center group">
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 font-bold rounded-xl mr-3 shrink-0 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              {num}
                            </div>
                            <input 
                              type="text" 
                              placeholder="Nhập đáp án..."
                              value={answers[num] || ''}
                              onChange={(e) => handleAnswerChange(num, e.target.value)}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase font-medium text-gray-800"
                            />
                          </div>
                        </div>
                      );
                    })}
                 </div>
                 <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button 
                      onClick={handleSubmit} 
                      disabled={isLoading} 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center"
                    >
                      {isLoading ? "Đang xử lý..." : "Nộp Bài & Chấm Điểm"}
                    </button>
                 </div>
               </>
             ) : (
               // GIAO DIỆN HIỂN THỊ KẾT QUẢ
               <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50/20 to-white text-center overflow-y-auto animate-[fadeIn_0.5s_ease-out]">
                 <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">
                   🎉
                 </div>
                 <h2 className="text-3xl font-black text-gray-800 mb-2">Hoàn Thành Bài Thi!</h2>
                 <p className="text-gray-500 font-medium mb-8">Hệ thống đã ghi nhận và chấm điểm tự động.</p>
                 
                 <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
                   <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Điểm số (Hệ 100%)</p>
                     <p className="text-3xl font-black text-blue-600">{resultRecord.score.toFixed(1)}%</p>
                   </div>
                   <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Thời gian làm</p>
                     <p className="text-xl font-black text-gray-800 mt-1 font-mono">
                       {Math.floor(resultRecord.durationSeconds / 60)}p {resultRecord.durationSeconds % 60}s
                     </p>
                   </div>
                 </div>

                 <button 
                   onClick={() => navigate('/dashboard')}
                   className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all"
                 >
                   Quay lại Trang chủ
                 </button>
               </div>
             )}
          </div>
        </div>

      </div>

      {/* --- TABS CHUYỂN ĐỔI TRÊN MOBILE --- */}
      <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white p-1.5 rounded-full shadow-2xl border border-gray-100 flex gap-1 z-50 w-11/12 max-w-[300px]">
        <button 
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${activeTab === 'pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 bg-transparent'}`}
        >
          📖 Đọc Đề
        </button>
        <button 
          onClick={() => setActiveTab('answers')}
          className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${activeTab === 'answers' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 bg-transparent'}`}
        >
          📝 Làm Bài
        </button>
      </div>

    </div>
  );
};

export default MockTestSplitScreen; 