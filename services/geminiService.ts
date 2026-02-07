import { GoogleGenAI } from "@google/genai";
import { ExamData, AnalysisResult, GeminiModel } from "../types";

// Helper to clean JSON string from Markdown formatting
const cleanJsonString = (str: string) => {
  if (!str) return "";
  let cleaned = str.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  return cleaned.trim();
};

const DEFAULT_FALLBACK_CHAIN = [
  GeminiModel.FLASH_3,
  GeminiModel.PRO_3,
  GeminiModel.FLASH_25
];

interface GenConfig {
  apiKey: string;
  model: GeminiModel;
}

// Internal helper to get client
const getClient = (apiKey: string) => {
  if (!apiKey) throw new Error("Vui lòng nhập API Key trong phần Cài đặt");
  return new GoogleGenAI({ apiKey });
};

async function generateWithFallback(
  config: GenConfig,
  prompt: string,
  systemInstruction?: string,
  schemaType: 'analysis' | 'exam' = 'analysis'
): Promise<any> {
  const { apiKey, model } = config;
  const client = getClient(apiKey);

  // Construct try chain: Current Model -> Then others in sequence (skipping current)
  const tryChain = [
    model,
    ...DEFAULT_FALLBACK_CHAIN.filter(m => m !== model)
  ];

  let lastError = null;

  for (const currentModel of tryChain) {
    try {
      console.log(`Attempting with model: ${currentModel}`);
      const response = await client.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: systemInstruction
        }
      });

      if (response.text) {
        const cleanedText = cleanJsonString(response.text);
        try {
          return JSON.parse(cleanedText);
        } catch (e) {
          console.error(`JSON Parse Error on model ${currentModel}:`, e);
          throw new Error(`Model ${currentModel} trả về dữ liệu không đúng định dạng JSON.`);
        }
      }
      throw new Error(`No text returned from ${currentModel}`);

    } catch (err: any) {
      console.warn(`Model ${currentModel} failed:`, err.message);

      // Better error message for common issues
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        lastError = new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.');
      } else if (err.message?.includes('API key')) {
        lastError = new Error('API Key không hợp lệ. Vui lòng kiểm tra lại trong Settings.');
      } else if (err.message?.includes('quota') || err.message?.includes('rate')) {
        lastError = new Error('Đã vượt quá giới hạn API. Vui lòng thử lại sau vài giây.');
      } else {
        lastError = err;
      }
      // Continue to next model...
    }
  }

  // If all failed
  throw lastError || new Error("Tất cả các model đều thất bại. Vui lòng kiểm tra lại API Key hoặc thử lại sau.");
}

/**
 * Step 1: Analyze the uploaded exam text
 */
export const analyzeExamFile = async (fileContent: string, config: GenConfig): Promise<AnalysisResult> => {
  const prompt = `
    Bạn là một chuyên gia giáo dục Tiếng Anh tại Việt Nam. 
    Hãy phân tích nội dung đề thi dưới đây (được trích xuất từ file).
    
    Nhiệm vụ:
    1. Xác định mức độ khó tổng thể (Dễ/Trung bình/Khá/Khó).
    2. Tóm tắt cấu trúc (Các phần chính, số lượng câu).
    3. Đánh giá khung năng lực ngoại ngữ (CEFR Level ước lượng, ví dụ A2, B1).
    4. PHÂN TÍCH RIÊNG PHẦN ĐỌC HIỂU (READING) VÀ ĐIỀN TỪ (CLOZE TEST):
       - READING COMPREHENSION: Tính toán số từ trung bình của các bài đọc hiểu.
       - CLOZE TEST: Tính toán số từ trung bình của các đoạn văn điền từ.
       - Mô tả ngắn gọn độ phức tạp ngữ liệu.
    
    Trả về định dạng JSON:
    {
      "difficulty": "string",
      "structureSummary": "string",
      "cefrLevel": "string",
      "clozeStats": {
        "avgWordCount": number, 
        "difficultyDesc": "string"
      },
      "readingStats": {
        "avgWordCount": number,
        "difficultyDesc": "string"
      }
    }

    Nội dung đề thi:
    ${fileContent.substring(0, 15000)} 
  `;

  try {
    const result = await generateWithFallback(config, prompt, undefined, 'analysis');
    return result as AnalysisResult;
  } catch (error: any) {
    console.error("Analysis failed:", error);
    // Fallback mock if completely fails? No, instructions say "Show red error".
    // But preserving specific fallback object return for UI handling if needed,
    // actually instructions say "Hien thong bao loi mau do". So throwing is correct.
    throw error;
  }
};

/**
 * Step 3: Generate the full exam based on matrix and analysis
 */
export const generateFullExam = async (
  matrixText: string,
  analysisData: AnalysisResult,
  config: GenConfig
): Promise<ExamData> => {

  const systemInstruction = `
    Bạn là chuyên gia soạn đề thi Tiếng Anh tuyển sinh vào lớp 10 THPT tại Việt Nam.
    Bạn nắm vững chương trình GDPT 2018 (Sách Global Success, Friends Plus...).
    
    Yêu cầu quan trọng:
    - Nội dung: 85% kiến thức lớp 9, 10% lớp 8, 5% nâng cao.
    - Không trùng lặp câu hỏi cũ.
    - Ngôn ngữ: Tiếng Anh chuẩn mực.
  `;

  const prompt = `
    Hãy tạo một đề thi hoàn chỉnh dựa trên MA TRẬN và CÁC RÀNG BUỘC sau đây.

    1. ĐỘ KHÓ MỤC TIÊU: ${analysisData.difficulty} (Tương đương ${analysisData.cefrLevel}).
    
    2. RÀNG BUỘC PHẦN ĐỌC HIỂU (READING) VÀ ĐIỀN TỪ (CLOZE TEST) - BẮT BUỘC TUÂN THỦ:
       - BÀI ĐỌC HIỂU (Reading Comprehension): Độ dài khoảng ${analysisData.readingStats.avgWordCount} từ/bài (±10%).
       - BÀI ĐIỀN TỪ (Cloze Test): Độ dài khoảng ${analysisData.clozeStats.avgWordCount} từ/bài (±10%).
       - NGỮ LIỆU: Sử dụng ngữ liệu có độ khó tương đương mô tả: "${analysisData.readingStats.difficultyDesc}".
       - CHỦ ĐỀ: Nằm trong chương trình SGK Tiếng Anh 9 mới (Global Success, Friends Plus...).
       - LƯU Ý: Nếu ma trận yêu cầu nhiều bài đọc, hãy tuân thủ độ dài từng loại tương ứng.

    3. CẤU TRÚC JSON CHO BÀI ĐỌC (READING/CLOZE TEST):
       - NỘI DUNG ĐOẠN VĂN: Phải đặt trong trường "passageContent" của đối tượng Section. Tuyệt đối không đặt đoạn văn vào nội dung câu hỏi (Questions).
       - CÁC CÂU HỎI: Nằm trong mảng "questions" như bình thường.
       - Với Cloze Test (điền từ): Đoạn văn chứa các chỗ trống đánh số (1), (2)... nằm trong "passageContent". Các câu hỏi trắc nghiệm tương ứng nằm trong "questions".

    4. QUY ĐỊNH ĐỊNH DẠNG ĐẶC BIỆT CHO DẠNG BÀI HỘI THOẠI (GAP-FILL CONVERSATION):
       - Nếu ma trận có dạng bài "Read the conversation and choose the correct letter...", hãy tạo ra MỘT câu hỏi duy nhất (Question object) đại diện cho cả bài.
       - Type: "conversation-matching"
       - Content: Chứa toàn bộ đoạn hội thoại, với các vị trí điền khuyết dạng (1), (2), (3)...
       - Options: Chứa danh sách các câu trả lời (A, B, C, D, E, F, G...).
       - questionCount: Bắt buộc phải có trường này, giá trị là số lượng ô trống cần điền (ví dụ: 5).
       - correctAnswer: Liệt kê đáp án theo thứ tự, ví dụ: "1-A, 2-C, 3-D...".

    4.5. QUY ĐỊNH DẠNG BÀI ĐỌC THÔNG TIN NGẮN (READ THE TEXTS):
       - Dạng bài này gồm nhiều đoạn văn bản ngắn (tin nhắn, biển báo, ghi chú, thông báo...).
       - MỖI đoạn văn bản ngắn tương ứng với MỘT câu hỏi riêng biệt.
       - Cấu trúc mỗi câu hỏi:
         {
           "id": "short_text_1",
           "partName": "Read the texts",
           "type": "multiple-choice",
           "content": "[TIN NHẮN/BIỂN BÁO]:\\nBarbara, I had a Great Time\\nSkateboarding with you again yesterday!\\nI can't find my cap anywhere.\\nDid I leave it at your place?\\nKen\\n\\n[CÂU HỎI]: What would Ken like Barbara to do?",
           "options": ["A. look for something that he has lost", "B. bring his skateboard to school", "C. go skateboarding with him soon", "D. decide where they will meet next"],
           "correctAnswer": "A",
           "level": "Thông hiểu"
         }
       - LƯU Ý: Trường "content" PHẢI chứa CẢ đoạn văn bản ngắn VÀ câu hỏi, cách nhau bằng "[CÂU HỎI]:".
       - Ví dụ các loại văn bản: tin nhắn điện thoại, biển báo nơi công cộng, ghi chú để lại, email ngắn, thông báo.
       - Độ khó tương đương: Đoạn văn 30-50 từ, câu hỏi kiểm tra hiểu ý chính hoặc chi tiết cụ thể.

    5. MA TRẬN ĐỀ THI:
    ${matrixText}

    6. YÊU CẦU QUAN TRỌNG VỀ TIÊU ĐỀ PHẦN (Sections Title):
       - Field "title" trong mảng "sections" PHẢI chứa đầy đủ tên phần và hướng dẫn làm bài (Instruction).
       - Định dạng bắt buộc: "Part [số]. [Hướng dẫn chi tiết]". 
       - Ví dụ đúng: "Part 1. Choose the letter (A, B, C or D) to indicate the correct answer to each of the following questions."

    7. YÊU CẦU ĐẦU RA (JSON):
    Trả về JSON cấu trúc như sau (KHÔNG thêm markdown block):
    {
      "title": "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT",
      "subtitle": "MÔN: TIẾNG ANH - NĂM HỌC 2024-2025",
      "duration": 60,
      "sections": [
        {
          "title": "Part 1. Choose the letter...",
          "totalPoints": 0.0,
          "questions": [
            {
              "id": "unique_id",
              "partName": "Tên phần",
              "type": "multiple-choice",
              "content": "NỘI DUNG CÂU HỎI ĐẦY ĐỦ - BẮT BUỘC PHẢI CÓ. Ví dụ: My sister _____ to school every day.",
              "options": ["A. go", "B. goes", "C. going", "D. went"],
              "correctAnswer": "B",
              "level": "Nhận biết"
            }
          ]
        },
        {
          "title": "Part 5. Read the following passage...",
          "passageContent": "Đoạn văn đọc hiểu với các chỗ trống (1), (2)... nếu là Cloze Test",
          "totalPoints": 0.0,
          "questions": [
            {
              "id": "cloze_1",
              "partName": "Cloze Test",
              "type": "multiple-choice",
              "content": "Câu hỏi tương ứng với chỗ trống (1) trong đoạn văn",
              "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
              "correctAnswer": "A",
              "level": "Thông hiểu"
            }
          ]
        }
      ]
    }

    8. LƯU Ý QUAN TRỌNG VỀ CÂU HỎI:
       - MỖI câu hỏi trong mảng "questions" BẮT BUỘC phải có trường "content" chứa nội dung câu hỏi đầy đủ.
       - Không được để trống "content". Nếu là dạng điền từ vào chỗ trống, content phải là câu có dấu _____.
       - Ví dụ câu hỏi ngữ pháp: "The teacher asked if we _____ our homework yet."
       - Ví dụ câu hỏi từ vựng: "The word 'preserve' in the passage is CLOSEST in meaning to _____."
  `;

  try {
    const result = await generateWithFallback(config, prompt, systemInstruction, 'exam');
    return result as ExamData;
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
};
