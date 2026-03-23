import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateResultPDF = async (data: any) => {
    try {
        const { student, results, attendance, rank, highestMarks = [] } = data;
        
        // Safety check for critical data
        if (!student || !results) {
            console.error('Missing critical data for PDF generation:', { student, results });
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;

        // Helper to get DataURL for Logo
        const getLogoData = async () => {
            try {
                const response = await fetch('/RABINDRA_LOGO.jpeg');
                if (!response.ok) return null;
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

        // Helper to get DataURL for Student Photo
        const getStudentPhotoData = async () => {
            if (!student.photo) return null;
            try {
                const baseUrl = import.meta.env.VITE_API_URL || '';
                const url = student.photo.startsWith('http') ? student.photo : `${baseUrl}${student.photo}`;
                const response = await fetch(url);
                if (!response.ok) return null;
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

        const studentPhotoData = await getStudentPhotoData();

        // 1. Main Border
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

        // 2. Header Section
        if (logoData) {
            try {
                doc.addImage(logoData as string, 'JPEG', margin + 5, margin + 5, 25, 25);
            } catch (e) {
                console.warn('Failed to add logo image to PDF:', e);
            }
        }

        if (studentPhotoData) {
            try {
                const format = student.photo.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
                const photoWidth = 20;
                const photoHeight = 26;
                // Flush to the right inner border so it never overlaps text
                const photoX = pageWidth - margin - photoWidth;
                const photoY = margin + 4;
                
                doc.addImage(studentPhotoData as string, format, photoX, photoY, photoWidth, photoHeight);
                
                // Draw a slight border around the photo
                doc.setDrawColor(200);
                doc.setLineWidth(0.3);
                doc.rect(photoX, photoY, photoWidth, photoHeight);
            } catch (e) {
                console.warn('Failed to add student photo to PDF:', e);
            }
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


        // 4. Student Info Section
        const infoY = addressY + 30;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        doc.line(margin, infoY - 6, pageWidth - margin, infoY - 6);
        doc.text(`Student Registration No. :`, margin + 5, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text((student.studentId || '').replace('S-', ''), margin + 55, infoY);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Student ID :`, pageWidth / 2 + 10, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.banglarSikkhaId || student.studentId || '-', pageWidth / 2 + 35, infoY);

        doc.line(margin, infoY + 4, pageWidth - margin, infoY + 4);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Student Name :`, margin + 5, infoY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text((student.name || '').toUpperCase(), margin + 35, infoY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text(`Class :`, pageWidth / 2 + 10, infoY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(student.className || '-', pageWidth / 2 + 25, infoY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text(`Roll :`, pageWidth - 40, infoY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(student.rollNumber || '-', pageWidth - 25, infoY + 10);
        
        doc.line(margin, infoY + 14, pageWidth - margin, infoY + 14);

        // 5. Marks Table (Dominant Center)
        const subjectsList = ['Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 'Hindi', 'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education', 'Spoken English', 'Project'];
        const actualSubjects = Array.from(new Set(results.map((r: any) => r.subject)));
        const listToUse = actualSubjects.length > 0 ? actualSubjects : subjectsList;

        const tableData = listToUse.map(subject => {
            const getMarks = (sem: string) => results.find((r: any) => r.subject === subject && r.semester === sem);
            const u1 = getMarks('Unit-I');
            const u2 = getMarks('Unit-II');
            const u3 = getMarks('Unit-III');
            const highest = (highestMarks || []).find((h: any) => h.subject === subject);
            
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
                highest?.max_marks || totalObtained
            ];
        });

        const grandTotalObtained = listToUse.reduce((acc: number, sub: any) => acc + results.filter((r: any) => r.subject === sub).reduce((a: number, b: any) => a + (b.marks || 0), 0), 0);
        const grandTotalFull = listToUse.reduce((acc: number, sub: any) => acc + results.filter((r: any) => r.subject === sub).reduce((a: number, b: any) => a + (b.totalMarks || 0), 0), 0);

        tableData.push([
            { content: 'Grand Total', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: (grandTotalFull / 3).toFixed(0), colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: (grandTotalFull / 3).toFixed(0), colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: (grandTotalFull / 3).toFixed(0), colSpan: 2, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: grandTotalFull.toString(), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: grandTotalObtained.toString(), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: calculateGrade(grandTotalObtained, grandTotalFull), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: grandTotalObtained.toString(), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }
        ]);

        autoTable(doc, {
            startY: infoY + 20,
            margin: { left: margin, right: 55 }, // Increased right margin
            head: [
                [{ content: 'Subject', rowSpan: 2 }, { content: 'UNIT - I', colSpan: 2 }, { content: 'UNIT - II', colSpan: 2 }, { content: 'UNIT - III', colSpan: 2 }, { content: 'Full Marks', rowSpan: 2 }, { content: 'Obtained Marks', rowSpan: 2 }, { content: 'Grade', rowSpan: 2 }, { content: 'Highest Marks', rowSpan: 2 }],
                ['FM', 'MO', 'FM', 'MO', 'FM', 'MO'] // Shortened headers to save space
            ],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 7, halign: 'center', lineWidth: 0.1 },
            bodyStyles: { fontSize: 8, halign: 'center', lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 32 } },
            styles: { overflow: 'linebreak' }
        });

        const tableFinalY = (doc as any).lastAutoTable?.finalY || infoY + 100;

        // 6. Sidebar (Right Side)
        const sidebarX = pageWidth - margin - 40; // Unified sidebar starting X
        const attWidth = 38;
        
        // 6a. Attendance Sidebar
        autoTable(doc, {
            startY: infoY + 20,
            margin: { left: sidebarX },
            tableWidth: attWidth,
            head: [[{ content: 'Attendance Record', styles: { fontSize: 7 } }]],
            body: [
                ['Days', 'Pres.', 'Abs.', '%'],
                [
                    (attendance?.total_days || 0).toString(), 
                    (attendance?.present_days || 0).toString(), 
                    (attendance?.absent_days || 0).toString(), 
                    `${attendance?.total_days ? ((attendance.present_days / attendance.total_days) * 100).toFixed(0) : 0}%`
                ]
            ],
            theme: 'grid',
            styles: { fontSize: 7, halign: 'center' },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        });

        const attFinalY = (doc as any).lastAutoTable?.finalY || infoY + 40;

        // 6b. Grades Legend Sidebar (Moved here from header)
        autoTable(doc, {
            startY: attFinalY + 5,
            margin: { left: sidebarX },
            tableWidth: attWidth,
            head: [['Grades']],
            body: [
                ['90-100', 'AA'],
                ['80-89', 'A+'],
                ['60-79', 'A'],
                ['50-59', 'B+'],
                ['30-49', 'B'],
                ['Below 29', 'C']
            ],
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1, halign: 'center' },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        });

        // 7. Academic Summary
        const summaryY = tableFinalY + 8;
        autoTable(doc, {
            startY: summaryY,
            margin: { left: margin },
            tableWidth: 80,
            body: [
                ['Total Full Marks', grandTotalFull.toString()],
                ['Total Obtained Marks', grandTotalObtained.toString()],
                ['Percentage of Marks', `${grandTotalFull ? ((grandTotalObtained / grandTotalFull) * 100).toFixed(2) : 0}%`],
                ['Class Rank', `${rank === '1' ? 'FIRST (1st)' : rank === '2' ? 'SECOND (2nd)' : rank === '3' ? 'THIRD (3rd)' : (rank || '-').toString()}`]
            ],
            theme: 'grid',
            styles: { fontSize: 9, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 45 } }
        });

        // Remarks & N.B.
        const remarksX = margin + 85;
        const remarksHeight = 35;
        doc.setDrawColor(0);
        doc.rect(remarksX, summaryY, pageWidth - remarksX - margin - 2, remarksHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Remarks', remarksX + 5, summaryY + 8);
        
        const per = grandTotalFull ? (grandTotalObtained / grandTotalFull) * 100 : 0;
        const remarkText = per >= 90 ? 'Excellent' : per >= 80 ? 'Very Good' : per >= 60 ? 'Good' : per >= 50 ? 'Satisfactory' : 'Needs Improvement';
        
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(16);
        doc.text(remarkText, remarksX + (pageWidth - remarksX - margin) / 2, summaryY + 18, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('N.B.:', remarksX + 5, summaryY + 28);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Physical Education: PT+Yoga+Health, Work Ed: Project+Drawing', remarksX + 5, summaryY + 32);

        // 8. Signatures (Moved lower to avoid overlap)
        const footerY = pageHeight - 35;
        doc.setLineWidth(0.2);
        doc.line(margin + 10, footerY, margin + 70, footerY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Signature of the Class Teacher', margin + 40, footerY + 5, { align: 'center' });

        doc.line(pageWidth - margin - 70, footerY, pageWidth - margin - 10, footerY);
        doc.text('Signature of the Principal', pageWidth - margin - 40, footerY + 5, { align: 'center' });

        doc.save(`${(student.name || 'Report').replace(/\s+/g, '_')}_Progress_Report_2025.pdf`);
    } catch (err) {
        console.error('Critical Error during PDF generation:', err);
        alert('Failed to generate PDF. Please contact the administrator.');
    }
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
