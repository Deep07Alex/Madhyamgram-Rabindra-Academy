import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateResultPDF = (data: any) => {
    const { student, results, attendance, rank } = data;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header Section
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MADHYAMGRAM RABINDRA ACADEMY', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Rabindra Nagar-Milanpally, P.O.-Ganganagar, P.S.-Madhyamgram, Kolkata-700132', pageWidth / 2, 21, { align: 'center' });
    doc.text('ESTD.-2005 \u2022 Regi No. : SO165438 \u2022 Udise Code : 19112601311', pageWidth / 2, 26, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(15, 30, pageWidth - 15, 30);
    doc.text(`YEARLY PROGRESS REPORT - 2025`, pageWidth / 2, 37, { align: 'center' });
    doc.line(15, 40, pageWidth - 15, 40);

    // 2. Student Info
    doc.setFontSize(10);
    doc.text(`Student Registration No. :  ${student.studentId}`, 20, 48);
    doc.text(`Student ID :  ${student.studentId}`, pageWidth - 80, 48);
    doc.text(`Student Name :  ${student.name.toUpperCase()}`, 20, 54);
    doc.text(`Class :  ${student.className}`, pageWidth - 80, 54);
    doc.text(`Roll :  ${student.rollNumber}`, pageWidth - 40, 54);

    // 3. Marks Table
    const subjects = Array.from(new Set(results.map((r: any) => r.subject)));
    const tableData = subjects.map(subject => {
        const u1 = results.find((r: any) => r.subject === subject && r.semester === 'Unit-I');
        const u2 = results.find((r: any) => r.subject === subject && r.semester === 'Unit-II');
        const u3 = results.find((r: any) => r.subject === subject && r.semester === 'Unit-III');
        
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
            '-' // Highest Marks (Placeholder)
        ];
    });

    // Add Grand Total Row
    const grandTotalObtained = results.reduce((acc: number, r: any) => acc + r.marks, 0);
    const grandTotalFull = results.reduce((acc: number, r: any) => acc + (r.totalMarks || 0), 0);
    
    tableData.push([
        { content: 'Grand Total', styles: { fontStyle: 'bold' } },
        '', '', '', '', '', '',
        grandTotalFull,
        grandTotalObtained,
        calculateGrade(grandTotalObtained, grandTotalFull),
        ''
    ]);

    doc.autoTable({
        startY: 60,
        head: [
            [{ content: 'Subject', rowSpan: 2 }, { content: 'UNIT - I', colSpan: 2 }, { content: 'UNIT - II', colSpan: 2 }, { content: 'UNIT - III', colSpan: 2 }, { content: 'Full Marks Unit I+II+III', rowSpan: 2 }, { content: 'Total Marks Obtained Unit I+II+III', rowSpan: 2 }, { content: 'Grade', rowSpan: 2 }, { content: 'Highest Marks', rowSpan: 2 }],
            ['Full Marks', 'Marks Obtained', 'Full Marks', 'Marks Obtained', 'Full Marks', 'Marks Obtained']
        ],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 7, halign: 'center', lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, halign: 'center', lineWidth: 0.1 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // 4. Summary & Attendance
    doc.setFontSize(10);
    doc.setDrawColor(200);
    doc.rect(15, finalY, pageWidth - 30, 40);
    
    doc.text(`Total Marks:`, 20, finalY + 8);
    doc.text(`${grandTotalFull}`, 80, finalY + 8);
    
    doc.text(`Obtained Marks:`, 20, finalY + 16);
    doc.text(`${grandTotalObtained}`, 80, finalY + 16);
    
    doc.text(`Percentage of Marks:`, 20, finalY + 24);
    doc.text(`${((grandTotalObtained / grandTotalFull) * 100).toFixed(2)}%`, 80, finalY + 24);
    
    doc.text(`Rank:`, 20, finalY + 32);
    doc.text(`${rank}`, 80, finalY + 32);

    // Attendance Box
    const attendX = pageWidth - 90;
    doc.rect(attendX, finalY, 75, 40);
    doc.setFontSize(8);
    doc.text('Attendance Record', attendX + 37.5, finalY + 5, { align: 'center' });
    doc.line(attendX, finalY + 7, attendX + 75, finalY + 7);
    
    doc.text('Working Days', attendX + 5, finalY + 15);
    doc.text(`${attendance.total_days}`, attendX + 60, finalY + 15);
    
    doc.text('Days Present', attendX + 5, finalY + 22);
    doc.text(`${attendance.present_days}`, attendX + 60, finalY + 22);
    
    doc.text('Days Absent', attendX + 5, finalY + 29);
    doc.text(`${attendance.absent_days}`, attendX + 60, finalY + 29);
    
    doc.text('% Attendance', attendX + 5, finalY + 36);
    doc.text(`${attendance.total_days ? ((attendance.present_days / attendance.total_days) * 100).toFixed(0) : 0}%`, attendX + 60, finalY + 36);

    // 5. Grades Legend
    const legendY = finalY + 45;
    doc.setFontSize(7);
    doc.text('Grades:', pageWidth - 60, legendY);
    doc.autoTable({
        startY: legendY + 2,
        margin: { left: pageWidth - 60 },
        tableWidth: 50,
        body: [
            ['90 - 100', 'AA', 'Excellent'],
            ['80 - 89', 'A+', 'Very Good'],
            ['60 - 79', 'A', 'Good'],
            ['50 - 59', 'B+', 'Satisfactory'],
            ['30 - 49', 'B', 'Fair'],
            ['Below 29', 'C', 'Not Satisfactory']
        ],
        theme: 'plain',
        styles: { fontSize: 6, cellPadding: 0.5 }
    });

    // 6. Signatures
    const sigY = legendY + 60;
    doc.line(20, sigY, 70, sigY);
    doc.text('Signature of the Class Teacher', 25, sigY + 5);
    
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.text('Signature of the Principal', pageWidth - 65, sigY + 5);

    doc.save(`${student.name}_Result_2025.pdf`);
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
