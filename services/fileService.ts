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
 * Calculate question count for conversation-matching
 */
const getQuestionIncrement = (q: Question): number => {
    if (q.questionCount && q.questionCount > 1) return q.questionCount;
    if (q.type === 'conversation-matching') {
        const matches = q.content.match(/\(\d+\)/g);
        return matches ? matches.length : 1;
    }
    return 1;
};

/**
 * Generate and download a professional DOCX exam file - matching preview exactly
 */
export const exportExamToDocx = async (examData: ExamData, filename: string = 'De_Thi_Tieng_Anh.docx') => {
    const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noCellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
    const boxBorder = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
    const boxCellBorders = { top: boxBorder, bottom: boxBorder, left: boxBorder, right: boxBorder };
    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

    const contentChildren: (Paragraph | Table)[] = [];
    const currentYear = new Date().getFullYear();

    // === HEADER: 2-column layout matching preview ===
    contentChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    // Left column (35%) - Administrative Info
                    new TableCell({
                        borders: noCellBorders,
                        width: { size: 35, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "SỞ GIÁO DỤC VÀ ĐÀO TẠO", bold: true, size: 22 })]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "ĐỀ THI THAM KHẢO", bold: true, size: 22 })]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
                                children: [new TextRun({ text: "" })]
                            })
                        ]
                    }),
                    // Right column (65%) - Exam Info
                    new TableCell({
                        borders: noCellBorders,
                        width: { size: 65, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT", bold: true, size: 26 })]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `NĂM HỌC ${currentYear} - ${currentYear + 1}`, bold: true, size: 26 })]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "MÔN: TIẾNG ANH", bold: true, size: 24 })]
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `Thời gian làm bài: ${examData.duration} phút`, italics: true, size: 22 })]
                            })
                        ]
                    })
                ]
            })
        ]
    }));

    // Divider line
    contentChildren.push(new Paragraph({
        spacing: { before: 200, after: 400 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } },
        children: [new TextRun({ text: "" })]
    }));

    // Global question counter
    let questionNumber = 1;

    // === SECTIONS ===
    examData.sections.forEach(section => {
        // Section Title - Bold (not italic, matching preview)
        contentChildren.push(new Paragraph({
            spacing: { before: 240, after: 160 },
            children: [new TextRun({ text: section.title, bold: true, size: 26 })]
        }));

        // Passage Content with text indent
        if (section.passageContent) {
            const paragraphs = section.passageContent.split('\n').filter(p => p.trim());
            paragraphs.forEach(para => {
                contentChildren.push(new Paragraph({
                    spacing: { after: 120 },
                    indent: { firstLine: 600 },
                    alignment: AlignmentType.JUSTIFIED,
                    children: [new TextRun({ text: para.trim(), size: 26 })]
                }));
            });
        }

        // Questions
        section.questions.forEach((q) => {
            const increment = getQuestionIncrement(q);
            const startNum = questionNumber;

            if (q.type === 'conversation-matching' && increment > 1) {
                // === CONVERSATION MATCHING ===
                let contentWithNumbers = q.content;
                let gapCounter = 0;
                contentWithNumbers = contentWithNumbers.replace(/\(\d+\)/g, () => {
                    const num = startNum + gapCounter;
                    gapCounter++;
                    return `(${num})`;
                });

                // Question label
                contentChildren.push(new Paragraph({
                    spacing: { before: 200 },
                    children: [
                        new TextRun({ text: `Question ${startNum}: `, bold: true, size: 26 }),
                        new TextRun({ text: contentWithNumbers, size: 26 })
                    ]
                }));

                // Options in bordered box (matching preview)
                if (q.options && q.options.length > 0) {
                    const optionParagraphs: Paragraph[] = [];
                    q.options.forEach((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const text = opt.trim().match(/^[A-Z]\./) ? opt.trim() : `${letter}. ${opt.trim()}`;
                        optionParagraphs.push(new Paragraph({
                            spacing: { after: 60 },
                            children: [new TextRun({ text, size: 26 })]
                        }));
                    });

                    contentChildren.push(new Table({
                        width: { size: 90, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        borders: boxCellBorders,
                                        margins: { top: 100, bottom: 100, left: 200, right: 200 },
                                        children: optionParagraphs
                                    })
                                ]
                            })
                        ]
                    }));
                }
            } else {
                // === MULTIPLE CHOICE / REGULAR ===
                contentChildren.push(new Paragraph({
                    spacing: { before: 160 },
                    indent: { left: 360 },
                    children: [
                        new TextRun({ text: `Question ${startNum}: `, bold: true, size: 26 }),
                        new TextRun({ text: q.content, size: 26 })
                    ]
                }));

                // Options in 2-column grid (matching preview)
                if (q.options && q.options.length > 0) {
                    const opts = q.options.map((opt, idx) => {
                        if (/^[A-Z]\./.test(opt.trim())) return opt.trim();
                        return `${String.fromCharCode(65 + idx)}. ${opt.trim()}`;
                    });

                    if (opts.length >= 4) {
                        // 2x2 grid
                        contentChildren.push(new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            borders: noCellBorders,
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            margins: { left: 720, top: 60, bottom: 60 },
                                            children: [new Paragraph({ children: [new TextRun({ text: opts[0], size: 26 })] })]
                                        }),
                                        new TableCell({
                                            borders: noCellBorders,
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            children: [new Paragraph({ children: [new TextRun({ text: opts[1], size: 26 })] })]
                                        })
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            borders: noCellBorders,
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            margins: { left: 720, top: 60, bottom: 60 },
                                            children: [new Paragraph({ children: [new TextRun({ text: opts[2], size: 26 })] })]
                                        }),
                                        new TableCell({
                                            borders: noCellBorders,
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            children: [new Paragraph({ children: [new TextRun({ text: opts[3], size: 26 })] })]
                                        })
                                    ]
                                })
                            ]
                        }));
                    } else {
                        contentChildren.push(new Paragraph({
                            indent: { left: 720 },
                            children: [new TextRun({ text: opts.join('\t\t'), size: 26 })]
                        }));
                    }
                }
            }

            questionNumber += increment;
        });
    });

    // === END MARKER ===
    contentChildren.push(new Paragraph({
        spacing: { before: 600 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "--- HẾT ---", italics: true, color: "808080", size: 24 })]
    }));

    // === ANSWER KEY (New Page) ===
    contentChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "ĐÁP ÁN GỢI Ý", bold: true, size: 28 })]
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

    // Create document
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman", size: 26 }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                }
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
