import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateResultPDF = async (data: any) => {
    const { student, results, attendance, rank, highestMarks = [] } = data;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Helper to get DataURL for Logo
    const getLogoData = async () => {
        try {
            const response = await fetch('/RABINDRA_LOGO.jpeg');
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    const logoData = await getLogoData();

    // 1. Main Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

    // 2. Header Section
    if (logoData) {
        doc.addImage(logoData as string, 'JPEG', margin + 5, margin + 5, 25, 25);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('MADHYAMGRAM', pageWidth / 2, margin + 12, { align: 'center' });
    doc.setFontSize(32);
    doc.text('RABINDRA ACADEMY', pageWidth / 2, margin + 24, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressY = margin + 30;
    doc.text('Rabindra Nagar-Milanpally, P.O.-Ganganagar, P.S.-Madhyamgram, Kolkata-700132', pageWidth / 2, addressY, { align: 'center' });
    doc.text('ESTD.-2005 \u2022 Regi No. : SO165438 \u2022 Udise Code : 19112601311', pageWidth / 2, addressY + 5, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.line(margin, addressY + 10, pageWidth - margin, addressY + 10);
    doc.text(`YEARLY PROGRESS REPORT - 2025`, pageWidth / 2, addressY + 18, { align: 'center' });
    doc.line(margin, addressY + 22, pageWidth - margin, addressY + 22);

    // 3. Grades Legend (Top Right Box)
    const legendX = pageWidth - 65;
    const legendY = margin;
    doc.autoTable({
        startY: legendY,
        margin: { left: legendX },
        tableWidth: 53,
        head: [['Grades']],
        body: [
            ['90 - 100', 'AA', 'Excellent'],
            ['80 - 89', 'A+', 'Very Good'],
            ['60 - 79', 'A', 'Good'],
            ['50 - 59', 'B+', 'Satisfactory'],
            ['30 - 49', 'B', 'Fair'],
            ['Below 29', 'C', 'Not Satisfactory']
        ],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    // 4. Student Info Section
    const infoY = addressY + 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Grid-like layout for info
    doc.line(margin, infoY - 6, pageWidth - margin, infoY - 6);
    doc.text(`Student Registration No. :`, margin + 5, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(student.studentId || '-', margin + 55, infoY);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Student ID :`, pageWidth / 2 + 10, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(student.banglarSikkhaId || student.studentId || '-', pageWidth / 2 + 35, infoY);

    doc.line(margin, infoY + 4, pageWidth - margin, infoY + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Student Name :`, margin + 5, infoY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(student.name.toUpperCase(), margin + 35, infoY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text(`Class :`, pageWidth / 2 + 10, infoY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(student.className, pageWidth / 2 + 25, infoY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text(`Roll :`, pageWidth - 40, infoY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(student.rollNumber, pageWidth - 25, infoY + 10);
    
    doc.line(margin, infoY + 14, pageWidth - margin, infoY + 14);

    // 5. Marks Table (Dominant Center)
    const subjects = Array.from(new Set([
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language',
        'Hindi', 'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge',
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education',
        'Spoken English', 'Project'
    ]));

    // Filter subjects that actually have marks or use the standard list
    const actualSubjects = subjects.filter(s => results.some((r: any) => r.subject === s));
    const listToUse = actualSubjects.length > 0 ? actualSubjects : subjects;

    const tableData = listToUse.map(subject => {
        const getMarks = (sem: string) => results.find((r: any) => r.subject === subject && r.semester === sem);
        const u1 = getMarks('Unit-I');
        const u2 = getMarks('Unit-II');
        const u3 = getMarks('Unit-III');
        const highest = highestMarks.find((h: any) => h.subject === subject);
        
        const totalObtained = (u1?.marks || 0) + (u2?.marks || 0) + (u3?.marks || 0);
        const totalFull = (u1?.totalMarks || 0) + (u2?.totalMarks || 0) + (u3?.totalMarks || 0);
        
        return [
            subject,
            u1?.totalMarks || '-', u1?.marks || '-',
            u2?.totalMarks || '-', u2?.marks || '-',
            u3?.totalMarks || '-', u3?.marks || '-',
            totalFull || '-', 
            totalObtained || '-',
            calculateGrade(totalObtained, totalFull),
            highest?.max_marks || totalObtained // Default to self if no other data
        ];
    });

    const grandTotalObtained = listToUse.reduce((acc, sub) => {
        return acc + results.filter((r: any) => r.subject === sub).reduce((a: number, b: any) => a + b.marks, 0);
    }, 0);
    
    const grandTotalFull = listToUse.reduce((acc, sub) => {
        return acc + results.filter((r: any) => r.subject === sub).reduce((a: number, b: any) => a + (b.totalMarks || 0), 0);
    }, 0);

    tableData.push([
        { content: 'Grand Total', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalFull / 3, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalFull / 3, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalFull / 3, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalFull, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalObtained, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: calculateGrade(grandTotalObtained, grandTotalFull), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: grandTotalObtained, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }
    ]);

    doc.autoTable({
        startY: infoY + 20,
        margin: { left: margin, right: 60 }, // Leave room for attendance sidebar
        head: [
            [{ content: 'Subject', rowSpan: 2 }, { content: 'UNIT - I', colSpan: 2 }, { content: 'UNIT - II', colSpan: 2 }, { content: 'UNIT - III', colSpan: 2 }, { content: 'Full Marks Unit I+II+III', rowSpan: 2 }, { content: 'Total Marks Obtained Unit I+II+III', rowSpan: 2 }, { content: 'Grade', rowSpan: 2 }, { content: 'Highest Marks', rowSpan: 2 }],
            ['Full Marks', 'Marks Obtained', 'Full Marks', 'Marks Obtained', 'Full Marks', 'Marks Obtained']
        ],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 7, halign: 'center', lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, halign: 'center', lineWidth: 0.1, textColor: [0, 0, 0] },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 } },
        styles: { overflow: 'linebreak' }
    });

    const tableFinalY = (doc as any).lastAutoTable.finalY;

    // 6. Attendance Sidebar (Positioned next to the table)
    doc.autoTable({
        startY: infoY + 20,
        margin: { left: pageWidth - 55 },
        tableWidth: 43,
        head: [[{ content: 'Attendance Record (Online+Offline Class)', styles: { fontSize: 7 } }]],
        body: [
            ['Working Days', 'Days Present', 'Days Absent', '% of Attendance'],
            [attendance.total_days, attendance.present_days, attendance.absent_days, `${attendance.total_days ? ((attendance.present_days / attendance.total_days) * 100).toFixed(0) : 0}%`]
        ],
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center' },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
    });

    // 7. Academic Summary (Bottom Left)
    const summaryY = tableFinalY + 10;
    doc.autoTable({
        startY: summaryY,
        margin: { left: margin },
        tableWidth: 80,
        body: [
            ['Total Marks', grandTotalFull],
            ['Obtained Marks', grandTotalObtained],
            ['Percentage of Marks', `${((grandTotalObtained / grandTotalFull) * 100).toFixed(2)}%`],
            ['Rank', `${rank === '1' ? 'FIRST (1st)' : rank === '2' ? 'SECOND (2nd)' : rank === '3' ? 'THIRD (3rd)' : rank}`]
        ],
        theme: 'grid',
        styles: { fontSize: 9, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 45 } }
    });

    // Remarks & N.B. (Middle Bottom)
    const remarksX = margin + 85;
    doc.setDrawColor(0);
    doc.rect(remarksX, summaryY, pageWidth - remarksX - margin, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks', remarksX + 5, summaryY + 10);
    doc.setFont('cursive', 'normal'); // Try to use a brush-like font if possible, or just bold italic
    
    // Determine Remark based on percentage
    const p = (grandTotalObtained / grandTotalFull) * 100;
    const remarkText = p >= 90 ? 'Excellent' : p >= 80 ? 'Very Good' : p >= 60 ? 'Good' : p >= 50 ? 'Satisfactory' : 'Needs Improvement';
    
    doc.setFontSize(16);
    doc.text(remarkText, remarksX + 35, summaryY + 15, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('N.B.:', remarksX + 5, summaryY + 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Physical Education = PT+Yoga+Dress & Cleanness+Health & Hygiene', remarksX + 5, summaryY + 30);
    doc.text('Work Education = Drawing+Handcraft+Cultural activities in school+Project', remarksX + 5, summaryY + 35);

    // 8. Signatures row
    const footerY = pageHeight - 35;
    doc.setLineWidth(0.2);
    doc.line(margin + 10, footerY, margin + 70, footerY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Signature of the Class Teacher & Date', margin + 40, footerY + 5, { align: 'center' });

    doc.line(pageWidth - margin - 70, footerY, pageWidth - margin - 10, footerY);
    doc.text('Signature of the Head of the Institution & Date', pageWidth - margin - 40, footerY + 5, { align: 'center' });

    // Save PDF
    doc.save(`${student.name.replace(/\s+/g, '_')}_Progress_Report_2025.pdf`);
};

function calculateGrade(marks: number, total: number) {
    if (!total || total === 0) return '-';
    const p = (marks / total) * 100;
    if (p >= 90) return 'AA';
    if (p >= 80) return 'A+';
    if (p >= 60) return 'A';
    if (p >= 50) return 'B+';
    if (p >= 30) return 'B';
    return 'C';
}
