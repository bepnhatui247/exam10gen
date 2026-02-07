export enum AppStep {
  UPLOAD = 1,
  MATRIX = 2,
  GENERATE = 3,
  PREVIEW = 4
}

export enum GeminiModel {
  FLASH_3 = 'gemini-3-flash-preview',
  PRO_3 = 'gemini-3-pro-preview',
  FLASH_25 = 'gemini-2.5-flash'
}

export enum QuestionLevel {
  NB = 'Nhận biết',
  TH = 'Thông hiểu',
  VD = 'Vận dụng',
  VDC = 'Vận dụng cao'
}

export interface Question {
  id: string;
  partName: string; // e.g., "Phát âm", "Reading"
  type: 'multiple-choice' | 'constructed-response' | 'essay' | 'conversation-matching';
  content: string;
  options?: string[]; // For multiple choice or matching list
  correctAnswer?: string; // For teacher reference
  level: QuestionLevel;
  questionCount?: number; // Number of sub-questions/gaps (e.g., 5 for a conversation gap fill)
}

export interface ExamSection {
  title: string;
  passageContent?: string; // New field for reading passages/cloze text
  questions: Question[];
  totalPoints: number;
}

export interface AnalysisResult {
  difficulty: string;
  structureSummary: string;
  cefrLevel: string;
  readingStats: {
    avgWordCount: number;
    difficultyDesc: string;
  };
}

export interface ExamData {
  title: string;
  subtitle: string;
  duration: number; // minutes
  sections: ExamSection[];
  analysis?: AnalysisResult;
}

export interface MatrixData {
  rawText: string;
  parsed?: any;
}
