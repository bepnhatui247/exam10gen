import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
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
 * Generate and download a professional DOCX exam file
 */
export const exportExamToDocx = async (examData: ExamData, filename: string = 'De_Thi_Tieng_Anh.docx') => {
    // Defines styles
    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "Normal",
                    name: "Normal",
                    run: {
                        font: "Times New Roman",
                        size: 24, // 12pt
                    },
                    paragraph: {
                        spacing: { line: 276 }, // 1.15 line spacing often look good or 1.5
                    },
                },
                {
                    id: "ExamHeader",
                    name: "Exam Header",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        bold: true,
                        size: 26, // 13pt
                    },
                    paragraph: {
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                    },
                },
                {
                    id: "SectionTitle",
                    name: "Section Title",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        bold: true,
                        size: 24, // 12pt
                    },
                    paragraph: {
                        spacing: { before: 240, after: 120 },
                    },
                },
            ],
        },
        sections: [{
            properties: {},
            children: [
                // HEADER
                new Paragraph({
                    text: examData.title.toUpperCase(),
                    style: "ExamHeader",
                }),
                new Paragraph({
                    text: examData.subtitle.toUpperCase(),
                    style: "ExamHeader",
                }),
                new Paragraph({
                    text: `Thời gian làm bài: ${examData.duration} phút`,
                    alignment: AlignmentType.CENTER,
                    run: { italics: true },
                    spacing: { after: 400 }
                }),

                // SECTIONS
                ...examData.sections.flatMap(section => {
                    const elements = [];

                    // Section Title (Part 1...)
                    elements.push(new Paragraph({
                        text: section.title,
                        style: "SectionTitle"
                    }));

                    // Passage Content if exists
                    if (section.passageContent) {
                        elements.push(new Paragraph({
                            text: section.passageContent,
                            spacing: { before: 120, after: 240 },
                            border: {
                                bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                                top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
                            },
                            run: { italics: true } // Italicize reading passages usually
                        }));
                    }

                    // Questions
                    section.questions.forEach((q, qIndex) => {
                        // For Conversation Matching, special rendering? 
                        // The structure is Question object. 

                        // Question content
                        const qLabel = q.type === 'conversation-matching' ? '' : `Question ${q.id}: `; // Usually generic ID or re-indexed? 
                        // Let's just use simple numbering or provided ID. 
                        // Ideally we should re-index globally but let's stick to simple for now.
                        // Actually, app logic doesn't re-index perfectly in current App.tsx preview, but export should look good.

                        elements.push(new Paragraph({
                            children: [
                                new TextRun({ text: q.content, bold: false }) // Content usually includes label? No, content is "Where is..."
                            ],
                            // If it's a gap fill or simple question, usually "Question 1: Where is..."
                            // I'll append the content directly as is often safest.
                        }));

                        // Options (Multiple Choice)
                        if (q.options && q.options.length > 0) {
                            // If options are short (A, B, C, D), try to put them on one line or 2 lines?
                            // For simplicity, 4 lines or check length.
                            const totalLength = q.options.join('').length;

                            if (totalLength < 40) {
                                // Tabular layout or simple spaced
                                elements.push(new Paragraph({
                                    text: q.options.join('       '), // Simple spacing
                                    indent: { left: 720 }, // Indent
                                }));
                            } else {
                                // Vertical list
                                q.options.forEach(opt => {
                                    elements.push(new Paragraph({
                                        text: opt,
                                        indent: { left: 720 },
                                    }));
                                });
                            }
                        }

                        // Space after question
                        elements.push(new Paragraph({ text: "", spacing: { after: 120 } }));
                    });

                    return elements;
                }),

                // ANSWER KEY (New Page)
                new Paragraph({
                    text: "ĐÁP ÁN GỢI Ý",
                    heading: HeadingLevel.HEADING_1,
                    pageBreakBefore: true,
                    alignment: AlignmentType.CENTER
                }),

                // Simple Answer Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: examData.sections.flatMap(section => {
                        // We want a row for section title, then rows for answers
                        const titleRow = new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ text: section.title, bold: true })],
                                    columnSpan: 2,
                                    shading: { fill: "F0F0F0" }
                                })
                            ]
                        });

                        const answerRows = section.questions.map(q => {
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph(q.content.substring(0, 50) + (q.content.length > 50 ? "..." : ""))], // Brief question ref
                                        width: { size: 70, type: WidthType.PERCENTAGE }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: q.correctAnswer || "", bold: true })],
                                        width: { size: 30, type: WidthType.PERCENTAGE }
                                    })
                                ]
                            });
                        });

                        return [titleRow, ...answerRows];
                    })
                })
            ],
        }],
    });

    try {
        const blob = await Packer.toBlob(doc);
        saveAs(blob, filename);
    } catch (err) {
        console.error("Docx Generation Error:", err);
        throw new Error("Có lỗi khi tạo file Word.");
    }
};
