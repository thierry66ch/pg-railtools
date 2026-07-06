import { blobToDataUrl, downloadTextFile } from '../transfer/files';
import { svgToPngBlob } from './png';
import type { ResultData } from './types';

export interface MarkdownDrawingOptions {
  svg: SVGSVGElement;
  alt?: string;
  scaleFactor?: number;
}

export async function resultToMarkdown(
  result: ResultData,
  drawing?: MarkdownDrawingOptions,
): Promise<string> {
  const lines: string[] = [`# ${result.title}`, ''];

  if (result.description) {
    lines.push(result.description, '');
  }

  if (drawing) {
    const blob = await svgToPngBlob(drawing.svg, drawing.scaleFactor);
    const dataUrl = await blobToDataUrl(blob);
    const alt = drawing.alt ?? result.drawingAlt ?? result.title;
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
  drawing?: MarkdownDrawingOptions,
): Promise<void> {
  downloadTextFile(filename, await resultToMarkdown(result, drawing), 'text/markdown');
}
