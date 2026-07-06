import { blobToDataUrl, downloadTextFile } from '../transfer/files';
import { svgToPngBlob } from './png';
import type { ResultData } from './types';

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

  if (options.svg) {
    const blob = await svgToPngBlob(options.svg, options.scaleFactor);
    const dataUrl = await blobToDataUrl(blob);
    const alt = options.drawingAlt ?? result.drawingAlt ?? result.title;
    lines.push(`![${alt}](${dataUrl})`, '');
  }

  if (result.table && result.table.rows.length > 0) {
    const { headers, rows } = result.table;
    lines.push(`| ${headers.join(' | ')} |`);
    lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    for (const row of rows) {
      lines.push(`| ${row.map((cell) => String(cell)).join(' | ')} |`);
    }
    lines.push('');
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
