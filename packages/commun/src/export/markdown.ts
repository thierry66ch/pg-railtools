import { downloadTextFile } from '../transfer/files';
import type { ResultData } from './types';

export function resultToMarkdown(result: ResultData): string {
  const lines: string[] = [`# ${result.title}`, ''];

  if (result.description) {
    lines.push(result.description, '');
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

export function exportResultToMarkdownFile(result: ResultData, filename: string): void {
  downloadTextFile(filename, resultToMarkdown(result), 'text/markdown');
}
