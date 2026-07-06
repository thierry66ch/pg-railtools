/**
 * Export d'une page de résultat (tableau rendu dans un élément DOM, et/ou dessin SVG) en
 * PDF. Les dépendances (jspdf, html2canvas) sont chargées dynamiquement : elles ne sont
 * utilisées que côté client, au moment du clic sur "Export PDF".
 */

import type { jsPDF } from 'jspdf';
import { blobToDataUrl } from '../transfer/files';
import { getSvgMmSize, svgToPngBlob } from './png';

export type PdfFormat = 'a4' | 'a3';

export interface PdfCartouche {
  appName: string;
  moduleName: string;
  projectName?: string;
  date?: Date;
}

export interface PdfExportOptions {
  format?: PdfFormat;
  cartouche?: PdfCartouche;
  /** Dessin à placer à l'échelle réelle (1 mm de dessin = 1 mm papier), sans mise à l'échelle. */
  svg?: SVGSVGElement;
}

const MARGIN_MM = 10;
const CARTOUCHE_HEIGHT_MM = 16;

function drawCartouche(pdf: jsPDF, cartouche: PdfCartouche, x: number, y: number, width: number): number {
  const logoSize = 10;

  pdf.setFillColor(31, 95, 139);
  pdf.rect(x, y, logoSize, logoSize, 'F');
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.6);
  pdf.line(x + 2, y + logoSize - 3.5, x + logoSize - 2, y + logoSize - 3.5);
  pdf.line(x + 2, y + logoSize - 2, x + logoSize - 2, y + logoSize - 2);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(5);
  pdf.text('PG', x + logoSize / 2, y + 4, { align: 'center' });

  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);
  pdf.text(cartouche.appName, x + logoSize + 3, y + 4);
  pdf.setFontSize(9);
  pdf.text(cartouche.moduleName, x + logoSize + 3, y + 9);

  const dateLabel = (cartouche.date ?? new Date()).toLocaleString('fr-CH');
  pdf.setFontSize(8);
  pdf.text(dateLabel, x + width, y + 4, { align: 'right' });
  if (cartouche.projectName) {
    pdf.text(cartouche.projectName, x + width, y + 9, { align: 'right' });
  }

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.2);
  pdf.line(x, y + CARTOUCHE_HEIGHT_MM, x + width, y + CARTOUCHE_HEIGHT_MM);

  return y + CARTOUCHE_HEIGHT_MM;
}

export async function exportElementToPdfFile(
  element: HTMLElement,
  filename: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const svgSize = options.svg ? getSvgMmSize(options.svg) : null;
  const orientation = svgSize && svgSize.width > svgSize.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: options.format ?? 'a4', orientation });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_MM * 2;

  let cursorY = MARGIN_MM;
  if (options.cartouche) {
    cursorY = drawCartouche(pdf, options.cartouche, MARGIN_MM, cursorY, contentWidth) + 4;
  }

  const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
  const imageData = canvas.toDataURL('image/png');
  const tableRenderWidth = contentWidth;
  const tableRenderHeight = (canvas.height / canvas.width) * tableRenderWidth;
  pdf.addImage(imageData, 'PNG', MARGIN_MM, cursorY, tableRenderWidth, tableRenderHeight);
  cursorY += tableRenderHeight + 6;

  if (options.svg && svgSize) {
    const blob = await svgToPngBlob(options.svg);
    const dataUrl = await blobToDataUrl(blob);
    // Échelle réelle : 1 mm de dessin = 1 mm papier, aucune mise à l'échelle automatique.
    // Si le dessin dépasse la page (ou est trop petit), c'est à l'utilisateur de choisir
    // une échelle de dessin adaptée et de refaire l'export.
    pdf.addImage(dataUrl, 'PNG', MARGIN_MM, cursorY, svgSize.width, svgSize.height);
  }

  pdf.save(filename);
}
