import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import { ExamData, Question } from '../types';

/**
 * Extract raw text from a DOCX file using Mammoth
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) {
                    reject(new Error("File is empty"));
                    return;
                }

                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (err) {
                console.error("Mammoth text extraction error:", err);
                reject(new Error("Không thể đọc nội dung file Word. Vui lòng đảm bảo file không bị lỗi."));
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Calculate question count - for conversation-matching, count gaps or use questionCount
 */
const getQuestionIncrement = (q: Question): number => {
    if (q.questionCount && q.questionCount > 1) {
        return q.questionCount;
    }
    if (q.type === 'conversation-matching') {
        const matches = q.content.match(/\(\d+\)/g);
        return matches ? matches.length : 1;
    }
    return 1;
};

/**
 * Generate and download a professional DOCX exam file
 */
export const exportExamToDocx = async (examData: ExamData, filename: string = 'De_Thi_Tieng_Anh.docx') => {
    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

    const contentChildren: (Paragraph | Table)[] = [];

    // HEADER
    contentChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT", bold: true, size: 26 })]
    }));

    contentChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: `NĂM HỌC ${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`, bold: true, size: 26 })]
    }));

    contentChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "MÔN: TIẾNG ANH", bold: true, size: 24 })]
    }));

    contentChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: `Thời gian làm bài: ${examData.duration} phút`, italics: true })]
    }));

    // Global question counter
    let questionNumber = 1;

    // SECTIONS
    examData.sections.forEach(section => {
        // Section Title
        contentChildren.push(new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: section.title, bold: true, size: 24 })]
        }));

        // Passage Content
        if (section.passageContent) {
            const paragraphs = section.passageContent.split('\n').filter(p => p.trim());
            paragraphs.forEach(para => {
                contentChildren.push(new Paragraph({
                    spacing: { after: 120 },
                    indent: { firstLine: 720 },
                    children: [new TextRun({ text: para.trim() })]
                }));
            });
        }

        // Questions
        section.questions.forEach((q) => {
            const increment = getQuestionIncrement(q);
            const startNum = questionNumber;

            // For conversation-matching with multiple gaps
            if (q.type === 'conversation-matching' && increment > 1) {
                let contentWithNumbers = q.content;
                let gapCounter = 0;
                contentWithNumbers = contentWithNumbers.replace(/\(\d+\)/g, () => {
                    const num = startNum + gapCounter;
                    gapCounter++;
                    return `(${num})`;
                });

                contentChildren.push(new Paragraph({
                    spacing: { before: 180 },
                    children: [
                        new TextRun({ text: `Question ${startNum}: `, bold: true }),
                        new TextRun({ text: contentWithNumbers })
                    ]
                }));

                // Options list
                if (q.options && q.options.length > 0) {
                    q.options.forEach((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const text = opt.trim().match(/^[A-Z]\./) ? opt.trim() : `${letter}. ${opt.trim()}`;
                        contentChildren.push(new Paragraph({
                            indent: { left: 720 },
                            children: [new TextRun({ text })]
                        }));
                    });
                }
            } else {
                // Regular question
                contentChildren.push(new Paragraph({
                    spacing: { before: 180 },
                    children: [
                        new TextRun({ text: `Question ${startNum}: `, bold: true }),
                        new TextRun({ text: q.content })
                    ]
                }));

                // Options horizontal
                if (q.options && q.options.length > 0) {
                    const opts = q.options.map((opt, idx) => {
                        if (/^[A-Z]\./.test(opt.trim())) return opt.trim();
                        return `${String.fromCharCode(65 + idx)}. ${opt.trim()}`;
                    });
                    contentChildren.push(new Paragraph({
                        indent: { left: 720 },
                        children: [new TextRun({ text: opts.join('\t\t') })]
                    }));
                }
            }

            questionNumber += increment;
        });
    });

    // ANSWER KEY
    contentChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "ĐÁP ÁN GỢI Ý", bold: true })]
    }));

    let answerNumber = 1;
    const tableRows: TableRow[] = [];

    examData.sections.forEach(section => {
        tableRows.push(new TableRow({
            children: [
                new TableCell({
                    borders: cellBorders,
                    columnSpan: 2,
                    shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
                    children: [new Paragraph({ children: [new TextRun({ text: section.title, bold: true })] })]
                })
            ]
        }));

        section.questions.forEach(q => {
            const inc = getQuestionIncrement(q);
            const label = inc > 1 ? `Question ${answerNumber}-${answerNumber + inc - 1}` : `Question ${answerNumber}`;
            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        borders: cellBorders,
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ children: [new TextRun({ text: label })] })]
                    }),
                    new TableCell({
                        borders: cellBorders,
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({ children: [new TextRun({ text: q.correctAnswer || "", bold: true })] })]
                    })
                ]
            }));
            answerNumber += inc;
        });
    });

    contentChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
    }));

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman", size: 24 }
                }
            }
        },
        sections: [{
            properties: {
                page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
            },
            children: contentChildren
        }]
    });

    try {
        const blob = await Packer.toBlob(doc);
        saveAs(blob, filename);
    } catch (err) {
        console.error("Docx Generation Error:", err);
        throw new Error("Có lỗi khi tạo file Word.");
    }
};
