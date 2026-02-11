import React, { useState } from 'react';
import { AppStep, ExamData, AnalysisResult } from './types';
import { analyzeExamFile, generateFullExam } from './services/geminiService';
import { extractTextFromDocx, exportExamToDocx } from './services/fileService';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { SettingsModal } from './components/SettingsModal';
import ExamPreview from './components/ExamPreview';
import { UploadIcon, FileTextIcon, WandIcon, CheckCircleIcon, ChevronRightIcon, SettingsIcon, AlertCircleIcon, DownloadIcon } from './components/Icons';

// Default matrix
const DEFAULT_MATRIX = `I. MULTIPLE CHOICE (8.0 points)
1. Phonetics (4 questions): Pronunciation (2), Stress (2).
2. Lexico-Grammar (6 questions): Tenses, Prepositions, Phrasal verbs, Word choice.
3. Functional Speaking (2 questions): Daily conversation exchanges.
4. Reading Comprehension (5 questions): Read a passage about Environment and answer.
5. Cloze Test (5 questions): Fill in the blanks (Topic: Technology).

II. WRITING (2.0 points)
1. Sentence Transformation (4 questions): Voice, Conditional, Reported speech.
2. Paragraph Writing (1 question): Write a paragraph (100-120 words) about a local festival.`;

const MainContent: React.FC = () => {
  const { apiKey, model, setIsSettingsOpen, hasKey } = useSettings();

  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [sampleAnalysis, setSampleAnalysis] = useState<AnalysisResult | null>(null);
  const [matrixText, setMatrixText] = useState(DEFAULT_MATRIX);
  const [generatedExam, setGeneratedExam] = useState<ExamData | null>(null);

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasKey) {
      setIsSettingsOpen(true);
      setError("Vui lòng nhập API Key trước khi sử dụng.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let text = "";
      if (file.name.endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      } else {
        // Fallback for txt
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      if (!text || text.trim().length === 0) {
        throw new Error("Không tìm thấy nội dung văn bản trong file.");
      }

      // Real analysis via Gemini with Context Config
      const analysis = await analyzeExamFile(text, { apiKey, model });
      setSampleAnalysis(analysis);
      setIsLoading(false);
      setCurrentStep(AppStep.MATRIX);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi khi đọc file. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sampleAnalysis) return;

    if (!hasKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const exam = await generateFullExam(matrixText, sampleAnalysis, { apiKey, model });
      setGeneratedExam(exam);
      setCurrentStep(AppStep.PREVIEW);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo đề thi. Vui lòng kiểm tra lại API Key hoặc đường truyền.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!generatedExam) return;
    try {
      await exportExamToDocx(generatedExam);
    } catch (err) {
      setError("Lỗi khi xuất file DOCX.");
    }
  };

  const StepIndicator = ({ step, label, isActive, isCompleted }: { step: number, label: string, isActive: boolean, isCompleted: boolean }) => (
    <div className={`flex items-center gap-2 ${isActive ? 'text-white font-bold' : isCompleted ? 'text-blue-100' : 'text-blue-300/70'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-base transition-colors ${isActive ? 'border-white bg-white text-[#0077b5]' :
        isCompleted ? 'border-blue-200 text-blue-100' : 'border-blue-400 text-blue-400'
        }`}>
        {step}
      </div>
      <span className="hidden md:inline text-base">{label}</span>
    </div>
  );

  const renderStep = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in bg-white rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#0077b5] rounded-full animate-spin mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-800">AI đang xử lý...</h3>
          <p className="text-gray-500 mt-2 text-lg">
            {currentStep === AppStep.UPLOAD ? "Đang phân tích cấu trúc đề thi..." : "Đang soạn thảo đề thi mới..."}
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case AppStep.UPLOAD:
        return (
          <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-100 text-center max-w-3xl mx-auto animate-fade-in">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <UploadIcon className="text-[#0077b5] w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tải lên đề thi mẫu</h2>
            <p className="text-gray-600 mb-10 text-lg leading-relaxed">
              Hệ thống sẽ tự động phân tích độ khó, cấu trúc và ngữ pháp từ đề thi cũ của bạn để tạo ra đề thi mới tương đương.
            </p>

            <label className="block w-full cursor-pointer group">
              <input type="file" className="hidden" accept=".docx,.txt" onChange={handleFileUpload} />
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-16 hover:border-[#0077b5] hover:bg-blue-50 transition-all duration-300 group-hover:shadow-md">
                <p className="text-xl font-medium text-gray-600 group-hover:text-[#0077b5] transition-colors">
                  Kéo thả hoặc nhấn để chọn file (DOCX/TXT)
                </p>
                <p className="text-sm text-gray-400 mt-3 font-medium">Khuyên dùng file .DOCX để AI đọc tốt nhất</p>
              </div>
            </label>
          </div>
        );

      case AppStep.MATRIX:
        return (
          <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 max-w-5xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircleIcon className="text-green-600 w-6 h-6" />
              </div>
              <h3 className="font-bold text-2xl text-gray-900">Kết quả phân tích & Ma trận</h3>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-[#0077b5] mb-2 uppercase tracking-wide">Độ khó chung</label>
                <div className="text-xl font-medium text-gray-800">{sampleAnalysis?.difficulty} ({sampleAnalysis?.cefrLevel})</div>
              </div>
              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-[#0077b5] mb-2 uppercase tracking-wide">Số từ bài đọc hiểu</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={sampleAnalysis?.readingStats.avgWordCount || 0}
                    onChange={(e) => {
                      if (sampleAnalysis) {
                        setSampleAnalysis({
                          ...sampleAnalysis,
                          readingStats: { ...sampleAnalysis.readingStats, avgWordCount: parseInt(e.target.value) || 0 }
                        });
                      }
                    }}
                    className="w-32 px-4 py-2 text-lg border border-gray-300 rounded focus:ring-2 focus:ring-[#0077b5] focus:border-[#0077b5] outline-none"
                  />
                  <span className="text-lg text-gray-600 font-medium">từ/bài</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-[#0077b5] mb-2 uppercase tracking-wide">Số từ bài điền từ (Cloze)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={sampleAnalysis?.clozeStats?.avgWordCount || 0}
                    onChange={(e) => {
                      if (sampleAnalysis) {
                        setSampleAnalysis({
                          ...sampleAnalysis,
                          clozeStats: {
                            ...sampleAnalysis.clozeStats || { avgWordCount: 0, difficultyDesc: '' },
                            avgWordCount: parseInt(e.target.value) || 0
                          }
                        });
                      }
                    }}
                    className="w-32 px-4 py-2 text-lg border border-gray-300 rounded focus:ring-2 focus:ring-[#0077b5] focus:border-[#0077b5] outline-none"
                  />
                  <span className="text-lg text-gray-600 font-medium">từ/bài</span>
                </div>
              </div>
              <div className="md:col-span-3 bg-white p-4 rounded shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-[#0077b5] mb-2 uppercase tracking-wide">Độ khó ngữ liệu đọc</label>
                <input
                  type="text"
                  value={sampleAnalysis?.readingStats.difficultyDesc || ''}
                  onChange={(e) => {
                    if (sampleAnalysis) {
                      setSampleAnalysis({
                        ...sampleAnalysis,
                        readingStats: { ...sampleAnalysis.readingStats, difficultyDesc: e.target.value }
                      });
                    }
                  }}
                  className="w-full px-4 py-2 text-lg border border-gray-300 rounded focus:ring-2 focus:ring-[#0077b5] focus:border-[#0077b5] outline-none"
                />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileTextIcon className="text-[#0077b5] w-6 h-6" />
              Ma trận đề thi mong muốn
            </h2>
            <textarea
              value={matrixText}
              onChange={(e) => setMatrixText(e.target.value)}
              className="w-full h-80 p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077b5] focus:border-[#0077b5] font-mono text-base leading-relaxed bg-white shadow-inner text-gray-800"
              placeholder="Nhập ma trận đề thi..."
            />

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleGenerate}
                className="bg-[#0077b5] hover:bg-[#006090] text-white text-lg px-10 py-4 rounded-lg font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                <WandIcon className="w-6 h-6" />
                TIẾN HÀNH TẠO ĐỀ THI
              </button>
            </div>
          </div>
        );

      case AppStep.PREVIEW:
        return generatedExam ? (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <CheckCircleIcon className="text-green-600" />
                Đề thi đã tạo thành công
              </h3>
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow hover:shadow-md transition-all"
              >
                <DownloadIcon className="w-5 h-5" />
                Tải file Word (.docx)
              </button>
            </div>
            <ExamPreview data={generatedExam} onExport={handleExport} />
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50">
      {/* HEADER */}
      <header className="bg-[#0077b5] border-b border-blue-700 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentStep(AppStep.UPLOAD)}>
            <div className="bg-white text-[#0077b5] w-14 h-14 rounded-xl flex items-center justify-center font-bold text-4xl shadow-sm">E</div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">ExamGen 10</h1>
              <p className="text-xs text-blue-100 font-medium">Trợ lý AI tạo đề TS 10</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress Indicators */}
            <div className="hidden md:flex items-center gap-6 mr-8">
              <StepIndicator step={1} label="Tải lên" isActive={currentStep === AppStep.UPLOAD} isCompleted={currentStep > AppStep.UPLOAD} />
              <ChevronRightIcon className="w-5 h-5 text-blue-300" />
              <StepIndicator step={2} label="Ma trận" isActive={currentStep === AppStep.MATRIX} isCompleted={currentStep > AppStep.MATRIX} />
              <ChevronRightIcon className="w-5 h-5 text-blue-300" />
              <StepIndicator step={3} label="Kết quả" isActive={currentStep === AppStep.PREVIEW} isCompleted={currentStep > AppStep.PREVIEW} />
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${hasKey ? 'bg-blue-600 text-blue-100 hover:bg-blue-500' : 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                }`}
            >
              {hasKey ? <SettingsIcon className="w-5 h-5" /> : <AlertCircleIcon className="w-5 h-5" />}
              <span className="hidden sm:inline">Settings</span>
              {!hasKey && (
                <span className="absolute -bottom-8 right-0 bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  Lấy API Key để sử dụng app
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 relative">
        {/* Quick Guide */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UploadIcon className="w-6 h-6 text-[#0077b5]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Bước 1: Tải lên</h3>
              <p className="text-sm text-gray-500">Upload đề mẫu (DOCX) để AI phân tích cấu trúc</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <WandIcon className="w-6 h-6 text-[#0077b5]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Bước 2: Ma trận</h3>
              <p className="text-sm text-gray-500">Xem kết quả phân tích và tùy chỉnh ma trận</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <DownloadIcon className="w-6 h-6 text-[#0077b5]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Bước 3: Tải về</h3>
              <p className="text-sm text-gray-500">Xuất đề thi mới ra file Word (.docx)</p>
            </div>
          </div>
        </div>

        <SettingsModal />

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg mb-8 flex items-center gap-3 shadow-sm animate-fade-in">
            <AlertCircleIcon className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium text-lg">{error}</span>
          </div>
        )}

        {renderStep()}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-6 text-center">
          <p className="text-slate-400 font-medium mb-1">ExamGen 10. Ứng dụng hỗ trợ giáo viên Tiếng Anh THCS Việt Nam.</p>
          <div className="flex justify-center gap-6 mt-1">
            <span className="text-white text-xl font-bold cursor-pointer transition-colors hover:text-blue-200">Zalo 0913.885.221 (Ông Giáo)</span>
          </div>
          <p className="mt-2 text-xs text-blue-400 opacity-80 font-bold">© {new Date().getFullYear()} GLOBALSUCCESSFILES.COM</p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <MainContent />
    </SettingsProvider>
  );
};

export default App;
