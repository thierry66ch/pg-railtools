import { blobToDataUrl, downloadTextFile } from '../transfer/files';
import { svgToPngBlob } from './png';
import type { ResultData, ResultTable } from './types';

function tableToMarkdownLines(table: ResultTable): string[] {
  const { headers, rows, boldCells } = table;
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  rows.forEach((row, rowIndex) => {
    const cells = row.map((cell, cellIndex) => {
      const text = String(cell);
      return boldCells?.[rowIndex]?.[cellIndex] ? `**${text}**` : text;
    });
    lines.push(`| ${cells.join(' | ')} |`);
  });
  return lines;
}

export interface MarkdownExportOptions {
  svg?: SVGSVGElement;
  drawingAlt?: string;
  scaleFactor?: number;
  projectName?: string;
  date?: Date;
}

export async function resultToMarkdown(
  result: ResultData,
  options: MarkdownExportOptions = {},
): Promise<string> {
  const lines: string[] = [`# ${result.title}`, ''];

  const metaLines: string[] = [];
  if (options.projectName) {
    metaLines.push(`**Projet :** ${options.projectName}`);
  }
  metaLines.push(`**Généré le :** ${(options.date ?? new Date()).toLocaleString('fr-CH')}`);
  lines.push(metaLines.join('  \n'), '');

  if (result.description) {
    lines.push(result.description, '');
  }

  if (result.summaryTable && result.summaryTable.rows.length > 0) {
    lines.push(...tableToMarkdownLines(result.summaryTable), '');
  }

  if (options.svg) {
    const blob = await svgToPngBlob(options.svg, options.scaleFactor ?? 8);
    const dataUrl = await blobToDataUrl(blob);
    const alt = options.drawingAlt ?? result.drawingAlt ?? result.title;
    lines.push(`![${alt}](${dataUrl})`, '');
  }

  // Markdown n'a pas de saut de page natif : `---` (règle horizontale) en tient lieu,
  // visible dans tout visualiseur, et respecté comme séparateur par les convertisseurs
  // (ex. pandoc → PDF) qui, eux, savent le traduire en vrai saut de page.
  if (result.pageBreakBeforeTable && (result.tableIntro || result.table)) {
    lines.push('---', '');
  }

  if (result.tableIntro && result.tableIntro.rows.length > 0) {
    lines.push(...tableToMarkdownLines(result.tableIntro), '');
  }

  if (result.table && result.table.rows.length > 0) {
    lines.push(...tableToMarkdownLines(result.table), '');
  }

  if (result.notes && result.notes.length > 0) {
    for (const note of result.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function exportResultToMarkdownFile(
  result: ResultData,
  filename: string,
  options: MarkdownExportOptions = {},
): Promise<void> {
  downloadTextFile(filename, await resultToMarkdown(result, options), 'text/markdown');
}
