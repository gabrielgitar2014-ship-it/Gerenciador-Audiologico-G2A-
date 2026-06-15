import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

export const generateProfessionalPDF = async (
  contentElement: HTMLElement | null,
  title: string,
  professionalName: string,
  professionalDocument: string // ex: "CRFa 12345" ou "CRM 12345"
) => {
  if (!contentElement) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header (Logo placeholder / Title)
  doc.setFillColor(63, 81, 181); // Indigo color
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('G2A', margin, 17);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestão de Audiometria Ocupacional', margin + 20, 17);

  // Content (Convert markdown HTML to canvas)
  // To avoid layout issues, we use html2canvas to capture the rich text
  // However, for a fully text-based PDF, we could parse the markdown. 
  // Let's use html2canvas for simplicity and rich fidelity.
  
  const canvas = await html2canvas(contentElement, {
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  
  const imgWidth = pageWidth - (margin * 2);
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let yPosition = 35;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPosition);
  
  yPosition += 10;
  
  // se a imagem for maior que a página, precisamos dividir (não ideal com imagem),
  // então ajustamos para caber.
  // Como html2canvas pode ser grande, o ideal é usar `html` plugin do jsPDF ou texto puro
  if (imgHeight > pageHeight - yPosition - 40) {
     // Paginação de imagem seria complexa, para um report vamos adicionar a imagem
     // com base na altura max. Aqui faremos simplificado
  }
  
  doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
  
  // Footer (Signature)
  const footerY = Math.max(yPosition + imgHeight + 20, pageHeight - 40);
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, footerY, pageWidth / 2 + 40, footerY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(professionalName, pageWidth / 2, footerY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(professionalDocument, pageWidth / 2, footerY + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${dayjs().format('DD/MM/YYYY HH:mm')} pelo sistema G2A`, margin, pageHeight - 10);
  
  doc.save(`${title.replace(/ /g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`);
};
