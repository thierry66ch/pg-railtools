/**
 * Export d'une page de résultat (tableau rendu dans un élément DOM, et/ou dessin SVG) en
 * PDF. Les dépendances (jspdf, html2canvas) sont chargées dynamiquement : elles ne sont
 * utilisées que côté client, au moment du clic sur "Export PDF".
 */

import type { jsPDF } from 'jspdf';
import { blobToDataUrl } from '../transfer/files';
import { getSvgMmSize, svgToPngBlob } from './png';

export type PdfPageFormat = 'a4-landscape' | 'a4-portrait' | 'a3-landscape' | 'a3-portrait';

function parsePageFormat(pageFormat: PdfPageFormat): {
  format: 'a4' | 'a3';
  orientation: 'landscape' | 'portrait';
} {
  const [format, orientation] = pageFormat.split('-') as ['a4' | 'a3', 'landscape' | 'portrait'];
  return { format, orientation };
}

export interface PdfCartouche {
  appName: string;
  moduleName: string;
  projectName?: string;
  date?: Date;
  /** Data URL (PNG) du logo à afficher dans le cartouche. À défaut, un logo simplifié est dessiné. */
  logoDataUrl?: string;
}

export interface PdfExportOptions {
  format?: PdfPageFormat;
  cartouche?: PdfCartouche;
  /** Dessin à placer à l'échelle réelle (1 mm de dessin = 1 mm papier), sans mise à l'échelle. */
  svg?: SVGSVGElement;
}

const MARGIN_MM = 10;
const CARTOUCHE_HEIGHT_MM = 16;

function drawCartoucheLogoFallback(pdf: jsPDF, x: number, y: number, logoSize: number): void {
  pdf.setFillColor(31, 95, 139);
  pdf.rect(x, y, logoSize, logoSize, 'F');
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.6);
  pdf.line(x + 2, y + logoSize - 3.5, x + logoSize - 2, y + logoSize - 3.5);
  pdf.line(x + 2, y + logoSize - 2, x + logoSize - 2, y + logoSize - 2);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(5);
  pdf.text('PG', x + logoSize / 2, y + 4, { align: 'center' });
}

function drawCartouche(pdf: jsPDF, cartouche: PdfCartouche, x: number, y: number, width: number): number {
  const logoSize = 10;

  // L'embarquement du logo ne doit jamais empêcher le reste du cartouche (nom du
  // module, projet, date) de s'afficher, même si l'image pose problème.
  try {
    if (cartouche.logoDataUrl) {
      pdf.addImage(cartouche.logoDataUrl, 'PNG', x, y, logoSize, logoSize);
    } else {
      drawCartoucheLogoFallback(pdf, x, y, logoSize);
    }
  } catch {
    drawCartoucheLogoFallback(pdf, x, y, logoSize);
  }

  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);
  pdf.text(cartouche.appName, x + logoSize + 3, y + 4);
  pdf.setFontSize(9);
  pdf.text(cartouche.moduleName, x + logoSize + 3, y + 9);

  const dateLabel = (cartouche.date ?? new Date()).toLocaleString('fr-CH');
  pdf.setFontSize(7.5);
  pdf.text(dateLabel, x + width, y + 4, { align: 'right' });
  if (cartouche.projectName) {
    pdf.text(cartouche.projectName, x + width, y + 8.5, { align: 'right' });
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
  const { format, orientation } = parsePageFormat(options.format ?? 'a4-landscape');
  const pdf = new jsPDF({ unit: 'mm', format, orientation });
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
    const blob = await svgToPngBlob(options.svg, 8);
    const dataUrl = await blobToDataUrl(blob);
    // Échelle réelle : 1 mm de dessin = 1 mm papier, aucune mise à l'échelle automatique.
    // Si le dessin dépasse la page (ou est trop petit), c'est à l'utilisateur de choisir
    // une échelle de dessin adaptée et de refaire l'export.
    pdf.addImage(dataUrl, 'PNG', MARGIN_MM, cursorY, svgSize.width, svgSize.height);
  }

  pdf.save(filename);
}
