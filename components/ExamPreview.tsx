import React, { useState, useMemo } from 'react';
import { ExamData, ExamSection, Question } from '../types';
import { DownloadIcon, EditIcon } from './Icons';

interface Props {
  data: ExamData;
  onExport: () => void;
}

const ExamPreview: React.FC<Props> = ({ data, onExport }) => {
  // Simple state to allow "editing" - in a real app this would update the deep structure
  const [editingId, setEditingId] = useState<string | null>(null);

  // Calculate current school year dynamically
  const currentYear = new Date().getFullYear();
  const schoolYear = `${currentYear} - ${currentYear + 1}`;

  const handleEditClick = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index); // 65 is 'A'
  };

  // Pre-calculate start numbers for all questions to ensure continuous numbering across sections
  const questionNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 1;
    
    data.sections.forEach(section => {
      section.questions.forEach(q => {
        map.set(q.id, counter);
        // If questionCount is not provided by AI, try to infer from content regex match for conversation type, else default to 1
        let increment = q.questionCount || 1;
        if (q.type === 'conversation-matching' && !q.questionCount) {
             const matches = q.content.match(/\(\d+\)/g);
             increment = matches ? matches.length : 1; 
        }
        counter += increment;
      });
    });
    return map;
  }, [data]);

  const renderQuestionContent = (q: Question) => {
    const startNumber = questionNumberMap.get(q.id) || 1;

    // Special rendering for Conversation Matching (Gap-fill) type
    if (q.type === 'conversation-matching') {
      
      // Dynamic replacement of numbers in content (e.g., (1) -> (11)) to match global exam numbering
      let contentWithCorrectNumbers = q.content;
      let gapCounter = 0;
      // Replace (number) pattern with incrementing global numbers
      contentWithCorrectNumbers = contentWithCorrectNumbers.replace(/\(\d+\)/g, () => {
          const num = startNumber + gapCounter;
          gapCounter++;
          return `(${num})`;
      });

      return (
        <div key={q.id} className="relative group p-2 rounded hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                   {/* 1. The Dialogue/Instructions Content */}
                    <div 
                        className={`text-black whitespace-pre-line ${editingId === q.id ? 'border-2 border-[#0077b5] p-3 rounded bg-white shadow-sm' : ''}`}
                        contentEditable={editingId === q.id}
                        suppressContentEditableWarning
                        style={{ fontSize: '13pt', lineHeight: '1.6', fontFamily: '"Times New Roman", Times, serif' }}
                    >
                        {/* We use the start number for the block label */}
                        <span className="font-bold mr-2" style={{ fontWeight: 'bold' }}>Question {startNumber}:</span>
                        {editingId === q.id ? q.content : contentWithCorrectNumbers}
                    </div>

                    {/* 2. The Boxed Options (A, B, C, D...) */}
                    {q.options && (
                        <div 
                            className="mt-5 border border-black p-5" 
                            style={{ border: '1px solid black', padding: '15px', marginTop: '20px' }}
                        >
                            <div className="flex flex-col gap-2" style={{ fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif' }}>
                                {q.options.map((opt, oIdx) => {
                                    const label = getOptionLabel(oIdx);
                                    // Handle cases where AI might already include "A."
                                    const text = opt.trim().match(/^[A-H]\./) ? opt : `${label}. ${opt}`;
                                    
                                    return (
                                        <div key={oIdx} className={`${editingId === q.id ? 'border border-[#0077b5] p-1 bg-blue-50' : ''}`}>
                                            {text}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                 {/* Edit Button */}
                 <button 
                    onClick={() => handleEditClick(q.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-[#0077b5] transition-opacity absolute right-0 top-0 bg-white rounded-full shadow-sm border border-gray-200"
                    title="Chỉnh sửa nội dung"
                >
                    <EditIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      );
    }

    // Default Rendering for Multiple Choice / Essay
    return (
      <div key={q.id} className="relative group p-2 rounded hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <span className="font-bold whitespace-nowrap pt-1" style={{ fontSize: '13pt', fontWeight: 'bold', fontFamily: '"Times New Roman", Times, serif' }}>Question {startNumber}:</span>
          <div className="flex-1">
            <div 
              className={`text-black ${editingId === q.id ? 'border-2 border-[#0077b5] p-3 rounded bg-white shadow-sm' : ''}`}
              contentEditable={editingId === q.id}
              suppressContentEditableWarning
              style={{ fontSize: '13pt', lineHeight: '1.6', fontFamily: '"Times New Roman", Times, serif' }}
            >
              {q.content}
            </div>
            
            {/* Options */}
            {q.options && (
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 mt-2 ml-4" style={{ fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif' }}>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className={`${editingId === q.id ? 'border border-[#0077b5] p-1 bg-blue-50' : ''}`}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Edit Button */}
          <button 
            onClick={() => handleEditClick(q.id)}
            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-[#0077b5] transition-opacity absolute right-0 top-0 bg-white rounded-full shadow-sm border border-gray-200"
            title="Chỉnh sửa nội dung"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden min-h-screen flex flex-col border border-gray-200 animate-fade-in">
      {/* Toolbar */}
      <div className="bg-[#0077b5] text-white p-5 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
             <span className="bg-white/20 p-1 rounded">DOC</span> Xem trước đề thi
          </h2>
          <p className="text-sm text-blue-100 mt-1 opacity-90">Chế độ xem trước khổ A4 - Nhấn vào nội dung để chỉnh sửa nhanh</p>
        </div>
        <button 
          onClick={onExport}
          className="bg-white text-[#0077b5] hover:bg-gray-100 px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all font-bold shadow-sm hover:shadow-md transform active:scale-95"
        >
          <DownloadIcon className="w-5 h-5" />
          Tải về DOCX
        </button>
      </div>

      {/* Exam Content - Mimicking Word Document Look - A4 Scaling */}
      <div className="p-16 overflow-y-auto flex-1 bg-white" id="exam-content" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        
        {/* Header - Refactored to 2 Columns Layout for Better Balance */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <tbody>
            <tr>
              {/* Left Column (35%) - Administrative Info */}
              <td style={{ width: '35%', verticalAlign: 'middle', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11pt' }}>ĐỀ THI THAM KHẢO</p>
                <div style={{ width: '80px', height: '1px', background: 'black', margin: '5px auto' }}></div>
              </td>
              
              {/* Right Column (65%) - Exam Info */}
              <td style={{ width: '65%', verticalAlign: 'middle', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase' }}>KỲ THI TUYỂN SINH VÀO LỚP 10 THPT</p>
                <p style={{ margin: '4px 0', fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase' }}>NĂM HỌC {schoolYear}</p>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase' }}>MÔN: TIẾNG ANH</p>
                <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '11pt' }}>Thời gian làm bài: {data.duration} phút</p>
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Divider Line */}
        <div style={{ borderBottom: '2px solid black', marginBottom: '35px' }}></div>

        {/* Sections */}
        <div className="space-y-8">
          {data.sections.map((section, sIdx) => (
            <div key={sIdx} className="mb-8">
              {/* Title */}
              <h3 className="font-bold mb-4" style={{ fontSize: '13pt' }}>
                {section.title}
              </h3>

              {/* Passage Content - Rendered before questions */}
              {section.passageContent && (
                 <div className="mb-6" style={{ fontSize: '13pt', lineHeight: '1.6', fontFamily: '"Times New Roman", Times, serif', textAlign: 'justify' }}>
                    {section.passageContent.split('\n').map((para, idx) => (
                        <p key={idx} className="mb-2" style={{ textIndent: '30px' }}>{para}</p>
                    ))}
                 </div>
              )}
              
              <div className="space-y-4">
                {section.questions.map((q) => renderQuestionContent(q))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-base italic text-gray-500">
          --- HẾT ---
        </div>
      </div>
    </div>
  );
};

export default ExamPreview;