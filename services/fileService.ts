import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import { ExamData } from '../types';

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
    // Table border style
    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
    const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noCellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    // Build content array
    const contentChildren: (Paragraph | Table)[] = [];

    // HEADER - Two column layout like preview
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

    // Divider line
    contentChildren.push(new Paragraph({
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } },
        children: [new TextRun({ text: "" })]
    }));

    // Global question counter across all sections
    let questionNumber = 1;

    // SECTIONS
    examData.sections.forEach(section => {
        // Section Title - Bold, italic like preview
        contentChildren.push(new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: section.title, bold: true, italics: true, size: 24 })]
        }));

        // Passage Content if exists
        if (section.passageContent) {
            // Split by paragraphs and add proper indentation
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
            // Question with "Question X:" label
            contentChildren.push(new Paragraph({
                spacing: { before: 180 },
                indent: { left: 360 },
                children: [
                    new TextRun({ text: `Question ${questionNumber}: `, bold: true }),
                    new TextRun({ text: q.content })
                ]
            }));

            // Options in 2-column grid format (A/B on row 1, C/D on row 2)
            if (q.options && q.options.length > 0) {
                const formattedOptions = q.options.map((opt, idx) => {
                    if (/^[A-Z]\./.test(opt.trim())) {
                        return opt.trim();
                    }
                    const letter = String.fromCharCode(65 + idx);
                    return `${letter}. ${opt.trim()}`;
                });

                // Create 2-column table for options (invisible borders)
                if (formattedOptions.length >= 4) {
                    // 4 options: 2 rows x 2 columns
                    contentChildren.push(new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        borders: noCellBorders,
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        margins: { left: 720 },
                                        children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[0] })] })]
                                    }),
                                    new TableCell({
                                        borders: noCellBorders,
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[1] })] })]
                                    })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        borders: noCellBorders,
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        margins: { left: 720 },
                                        children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[2] })] })]
                                    }),
                                    new TableCell({
                                        borders: noCellBorders,
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[3] })] })]
                                    })
                                ]
                            })
                        ]
                    }));
                } else {
                    // Less than 4 options: single line
                    contentChildren.push(new Paragraph({
                        indent: { left: 720 },
                        spacing: { after: 60 },
                        children: [new TextRun({ text: formattedOptions.join('\t\t') })]
                    }));
                }
            }

            questionNumber++;
        });
    });

    // ANSWER KEY (New Page)
    contentChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "ĐÁP ÁN GỢI Ý", bold: true })]
    }));

    // Reset counter for Answer Key
    let answerNumber = 1;

    // Build answer table rows
    const tableRows: TableRow[] = [];

    examData.sections.forEach(section => {
        // Section title row
        tableRows.push(new TableRow({
            children: [
                new TableCell({
                    borders: cellBorders,
                    columnSpan: 2,
                    shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
                    children: [new Paragraph({
                        children: [new TextRun({ text: section.title, bold: true })]
                    })]
                })
            ]
        }));

        // Answer rows
        section.questions.forEach(q => {
            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        borders: cellBorders,
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [new TextRun({ text: `Question ${answerNumber}` })]
                        })]
                    }),
                    new TableCell({
                        borders: cellBorders,
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [new TextRun({ text: q.correctAnswer || "", bold: true })]
                        })]
                    })
                ]
            }));
            answerNumber++;
        });
    });

    // Add answer table
    contentChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
    }));

    // Create document
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Times New Roman",
                        size: 24 // 12pt
                    }
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
