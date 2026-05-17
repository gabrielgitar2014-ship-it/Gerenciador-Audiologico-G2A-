import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

// Base64 de um logo placeholder. Substitua pelo seu logo em base64 ou carregue uma imagem.
// Para converter sua imagem para base64, você pode usar uma ferramenta online como https://www.base64-image.de/
const G2A_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVGhD7c5BDQAwEASh+je9N2gD61Jg2bEtpw8aWJgAFiZgYQIsTMDCBFgYgIUJWDgBiwuwMAELFWBhAhYWYGECFgZgYQIsTMDCBFgYgIUN+AM2gAABE5xIKAAAAABJRU5ErkJggg==';


// Função para adicionar cabeçalho, rodapé e marca d'água a todas as páginas
const addHeadersAndFooters = (doc: jsPDF, pageCount: number, reportTitle: string) => {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // MARCA D'ÁGUA
    // Adicione a imagem do logo no centro com baixa opacidade
    const logoWidth = 80;
    const logoHeight = 80;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = (pageHeight - logoHeight) / 2;
    doc.saveGraphicsState(); // Salva o estado atual
    doc.setGState(new doc.GState({ opacity: 0.1 })); // Define a opacidade
    doc.addImage(G2A_LOGO_BASE64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    doc.restoreGraphicsState(); // Restaura o estado para não afetar outros elementos

    // CABEÇALHO
    doc.addImage(G2A_LOGO_BASE64, 'PNG', margin, 10, 20, 20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('G2A - Gestão de Audiometria Ocupacional', margin + 25, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(reportTitle, margin + 25, 27);
    doc.setDrawColor(0);
    doc.line(margin, 35, pageWidth - margin, 35);

    // RODAPÉ
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}`, margin, pageHeight - 10);
  }
};

interface ReportData {
  title: string;
  meta: { [key: string]: string }; // Ex: { "Empresa": "XPTO", "Data": "15/05/2026" }
  sections: {
    title: string;
    content?: string; // Para texto corrido
    table?: {
      head: any[][];
      body: any[][];
    };
  }[];
  signature: {
    name: string;
    document: string;
  };
}

export const generateProfessionalReport = (data: ReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  let finalY = 45; // Posição inicial do conteúdo após o cabeçalho

  // Adiciona os metadados (informações do relatório)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  Object.entries(data.meta).forEach(([key, value]) => {
    doc.text(`${key}:`, margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 30, finalY);
    finalY += 6;
  });
  finalY += 10;

  // Adiciona as seções
  data.sections.forEach(section => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, finalY);
    finalY += 8;

    if (section.content) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(section.content, pageWidth - margin * 2);
      doc.text(lines, margin, finalY);
      // Calcula o Y após o texto. O cálculo pode precisar de ajuste
      finalY += lines.length * 4 + 5;
    }

    if (section.table) {
      autoTable(doc, {
        head: section.table.head,
        body: section.table.body,
        startY: finalY,
        theme: 'striped',
        headStyles: {
          fillColor: [63, 81, 181]
        },
        margin: { left: margin, right: margin }
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }
  });

  // Adiciona a Assinatura
  finalY += 20;
  // Verifica se a assinatura cabe na página, senão, adiciona uma nova
  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 45;
  }
  doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.signature.name, pageWidth / 2, finalY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(data.signature.document, pageWidth / 2, finalY + 10, { align: 'center' });


  // Adiciona cabeçalho e rodapé a todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  addHeadersAndFooters(doc, pageCount, data.title);

  // Salva o PDF
  doc.save(`${data.title.replace(/ /g, '_')}_${dayjs().format('YYYYMMDD')}.pdf`);
};
