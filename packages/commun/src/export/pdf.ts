/**
 * Export d'une page de résultat (dessin et/ou tableau, rendus dans un élément DOM) en PDF.
 * Les dépendances (jspdf, html2canvas) sont chargées dynamiquement : elles ne sont utilisées
 * que côté client, au moment du clic sur "Export PDF".
 */

export async function exportElementToPdfFile(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
  const imageData = canvas.toDataURL('image/png');

  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const renderWidth = canvas.width * ratio;
  const renderHeight = canvas.height * ratio;
  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;

  pdf.addImage(imageData, 'PNG', offsetX, offsetY, renderWidth, renderHeight);
  pdf.save(filename);
}
