/**
 * Export d'une page de résultat (tableau de données, et/ou dessin SVG) en PDF. Le
 * tableau est dessiné nativement (texte vectoriel jsPDF), pas capturé depuis le DOM :
 * html2canvas s'est montré peu fiable pour du texte (espaces avalés, voire rendu
 * totalement vide selon les options). La dépendance (jspdf) est chargée dynamiquement :
 * elle n'est utilisée que côté client, au moment du clic sur "Export PDF".
 */

import type { jsPDF } from 'jspdf';
import { blobToDataUrl } from '../transfer/files';
import { getSvgContentBBoxMm, getSvgMmSize, svgToPngBlob } from './png';
import type { ResultTable } from './types';

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
  /** Résumé textuel court affiché avant le dessin (ex. contexte du résultat). */
  description?: string;
  /** Tableau récapitulatif court (ex. grandeurs clés), dessiné avant le dessin. */
  summaryTable?: ResultTable;
  /** Dessin à placer à l'échelle réelle (1 mm de dessin = 1 mm papier), sans mise à l'échelle. */
  svg?: SVGSVGElement;
  /** Tableau court dessiné juste avant `table` (ex. paramètres ayant produit ce tableau). */
  tableIntro?: ResultTable;
  /** Tableau de données du résultat, dessiné nativement (texte vectoriel). */
  table?: ResultTable;
  /** Insère un saut de page entre le dessin et `tableIntro`/`table`. */
  pageBreakBeforeTable?: boolean;
}

const MARGIN_MM = 10;
const CARTOUCHE_HEIGHT_MM = 16;
const TABLE_HEADER_HEIGHT_MM = 8;
const TABLE_ROW_HEIGHT_MM = 7;
const TABLE_CELL_PADDING_MM = 1.5;
const TABLE_FONT_SIZE = 8;
const DESCRIPTION_FONT_SIZE = 9;
const DESCRIPTION_LINE_HEIGHT_MM = 4;

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

  pdf.setFont('helvetica', 'normal');
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

/** Dessine le résumé textuel (ex. valeurs clés du résultat) avant le tableau. */
function drawDescription(pdf: jsPDF, description: string, x: number, y: number, width: number): number {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(DESCRIPTION_FONT_SIZE);
  pdf.setTextColor(28, 37, 48);
  const lines = pdf.splitTextToSize(description, width) as string[];
  lines.forEach((line, i) => {
    pdf.text(line, x, y + (i + 1) * DESCRIPTION_LINE_HEIGHT_MM);
  });
  return y + lines.length * DESCRIPTION_LINE_HEIGHT_MM;
}

/** Dessine le tableau de résultat en texte vectoriel (pas de capture DOM). */
function drawTable(pdf: jsPDF, table: ResultTable, x: number, y: number, width: number): number {
  const colCount = table.headers.length;
  const colWidth = width / colCount;
  let cursorY = y;

  pdf.setDrawColor(216, 221, 227);
  pdf.setLineWidth(0.2);
  pdf.setTextColor(28, 37, 48);
  pdf.line(x, cursorY, x + width, cursorY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(TABLE_FONT_SIZE);
  table.headers.forEach((header, i) => {
    pdf.text(header, x + i * colWidth + TABLE_CELL_PADDING_MM, cursorY + TABLE_HEADER_HEIGHT_MM - 2.5);
  });
  cursorY += TABLE_HEADER_HEIGHT_MM;
  pdf.line(x, cursorY, x + width, cursorY);

  pdf.setFont('helvetica', 'normal');
  for (const row of table.rows) {
    row.forEach((cell, i) => {
      pdf.text(String(cell), x + i * colWidth + TABLE_CELL_PADDING_MM, cursorY + TABLE_ROW_HEIGHT_MM - 2.5);
    });
    cursorY += TABLE_ROW_HEIGHT_MM;
    pdf.line(x, cursorY, x + width, cursorY);
  }

  for (let i = 0; i <= colCount; i++) {
    const lineX = x + i * colWidth;
    pdf.line(lineX, y, lineX, cursorY);
  }

  return cursorY;
}

export async function exportElementToPdfFile(
  filename: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const svgSize = options.svg ? getSvgMmSize(options.svg) : null;
  const { format, orientation } = parsePageFormat(options.format ?? 'a4-landscape');
  const pdf = new jsPDF({ unit: 'mm', format, orientation });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_MM * 2;

  let cursorY = MARGIN_MM;
  if (options.cartouche) {
    cursorY = drawCartouche(pdf, options.cartouche, MARGIN_MM, cursorY, contentWidth) + 4;
  }

  if (options.description) {
    cursorY = drawDescription(pdf, options.description, MARGIN_MM, cursorY, contentWidth) + 4;
  }

  if (options.summaryTable && options.summaryTable.rows.length > 0) {
    cursorY = drawTable(pdf, options.summaryTable, MARGIN_MM, cursorY, contentWidth) + 6;
  }

  if (options.svg && svgSize) {
    const blob = await svgToPngBlob(options.svg, 8);
    const dataUrl = await blobToDataUrl(blob);
    // Échelle réelle : 1 mm de dessin = 1 mm papier, aucune mise à l'échelle automatique.
    // Si le dessin dépasse la page (ou est trop petit), c'est à l'utilisateur de choisir
    // une échelle de dessin adaptée et de refaire l'export.
    // Aligne le bord GAUCHE RÉEL du contenu (pas le viewBox, dont la marge interne réservée
    // aux cotes dépasse souvent ce qui est effectivement dessiné) avec le cartouche/tableau :
    // utiliser `svgSize.x` (viewBox.x) directement suppose le pire cas (contenu collé au bord
    // du viewBox) et pousse sinon le contenu réel au-delà de MARGIN_MM, dans la marge
    // d'impression — repéré sur un dessin où une cote dépassait de la page (voir
    // pieges-a-eviter.md).
    const contentBBox = getSvgContentBBoxMm(options.svg);
    const drawingX = MARGIN_MM - (contentBBox.x - svgSize.x);
    pdf.addImage(dataUrl, 'PNG', drawingX, cursorY, svgSize.width, svgSize.height);
    cursorY += svgSize.height + 6;
  }

  if (options.pageBreakBeforeTable && (options.tableIntro || options.table)) {
    pdf.addPage();
    cursorY = MARGIN_MM;
  }

  if (options.tableIntro && options.tableIntro.rows.length > 0) {
    cursorY = drawTable(pdf, options.tableIntro, MARGIN_MM, cursorY, contentWidth) + 6;
  }

  if (options.table && options.table.rows.length > 0) {
    cursorY = drawTable(pdf, options.table, MARGIN_MM, cursorY, contentWidth) + 6;
  }

  pdf.save(filename);
}
