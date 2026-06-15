import jsPDF from 'jspdf';
import dayjs from 'dayjs';

export const generateTextPDF = (
  markdownText: string,
  title: string,
  professionalName: string,
  professionalDocument: string
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFillColor(63, 81, 181);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('G2A', margin, 13);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestão de Audiometria Ocupacional', margin + 15, 13);

  doc.setTextColor(0, 0, 0);
  let yPosition = 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Limpar markdown text
  let cleanText = markdownText.replace(/\*\*/g, '').replace(/\#/g, '').replace(/\*/g, '');
  
  const lines = doc.splitTextToSize(cleanText, pageWidth - (margin * 2));
  
  for (let i = 0; i < lines.length; i++) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(lines[i], margin, yPosition);
    yPosition += 5; // spacing
  }

  yPosition += 20;
  if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 40;
  }

  // Footer (Signature)
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(professionalName, pageWidth / 2, yPosition + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(professionalDocument, pageWidth / 2, yPosition + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${dayjs().format('DD/MM/YYYY HH:mm')} pelo sistema G2A`, margin, pageHeight - 10);
  
  doc.save(`${title.replace(/ /g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`);
};
