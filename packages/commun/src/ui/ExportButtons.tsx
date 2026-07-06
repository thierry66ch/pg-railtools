'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';
import { exportElementToPdfFile, type PdfPageFormat } from '../export/pdf';
import { exportResultToMarkdownFile } from '../export/markdown';
import { exportSvgToPngFile, svgMarkupToPngDataUrl } from '../export/png';
import type { ResultData } from '../export/types';

const APP_NAME = 'RailTools';
const LOGO_URL = '/icon.svg';
const PDF_PAGE_FORMATS: { value: PdfPageFormat; label: string }[] = [
  { value: 'a4-landscape', label: 'A4 paysage' },
  { value: 'a4-portrait', label: 'A4 portrait' },
  { value: 'a3-landscape', label: 'A3 paysage' },
  { value: 'a3-portrait', label: 'A3 portrait' },
];

async function getLogoDataUrl(): Promise<string | undefined> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return undefined;
    const svgMarkup = await response.text();
    return await svgMarkupToPngDataUrl(svgMarkup, 128);
  } catch {
    return undefined;
  }
}

export interface ExportButtonsProps {
  /** Nom de fichier sans extension, ex. "rayon-courbure-resultat". */
  filenameBase: string;
  /** Élément DOM contenant la page de résultat à capturer pour le PDF. */
  getResultElement: () => HTMLElement | null;
  /** Données structurées du résultat, pour l'export Markdown. */
  resultData: ResultData;
  /** Élément SVG du dessin, si le module en produit un (active le bouton PNG). */
  getSvgElement?: () => SVGSVGElement | null;
  /** Nom du projet actif, ex. pour le cartouche PDF et l'en-tête Markdown. */
  projectName?: string;
}

export function ExportButtons({
  filenameBase,
  getResultElement,
  resultData,
  getSvgElement,
  projectName,
}: ExportButtonsProps) {
  const t = useTranslations('common');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingMarkdown, setIsExportingMarkdown] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<PdfPageFormat>('a4-landscape');

  async function handlePdf() {
    const element = getResultElement();
    if (!element) return;
    setIsExportingPdf(true);
    try {
      const logoDataUrl = await getLogoDataUrl();
      await exportElementToPdfFile(element, `${filenameBase}.pdf`, {
        format: pdfFormat,
        svg: getSvgElement?.() ?? undefined,
        cartouche: {
          appName: APP_NAME,
          moduleName: resultData.title,
          projectName,
          logoDataUrl,
        },
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleMarkdown() {
    const svg = getSvgElement?.() ?? undefined;
    setIsExportingMarkdown(true);
    try {
      await exportResultToMarkdownFile(resultData, `${filenameBase}.md`, { svg, projectName });
    } finally {
      setIsExportingMarkdown(false);
    }
  }

  async function handlePng() {
    const svg = getSvgElement?.();
    if (!svg) return;
    setIsExportingPng(true);
    try {
      await exportSvgToPngFile(svg, `${filenameBase}.png`);
    } finally {
      setIsExportingPng(false);
    }
  }

  return (
    <div className="rt-toolbar">
      <label className="rt-field">
        <span>{t('export.pdfFormat')}</span>
        <select
          className="rt-select"
          value={pdfFormat}
          onChange={(event) => setPdfFormat(event.target.value as PdfPageFormat)}
        >
          {PDF_PAGE_FORMATS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" variant="secondary" onClick={() => void handlePdf()} disabled={isExportingPdf}>
        {t('actions.exportPdf')}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void handleMarkdown()}
        disabled={isExportingMarkdown}
      >
        {t('actions.exportMarkdown')}
      </Button>
      {getSvgElement && (
        <Button type="button" variant="secondary" onClick={() => void handlePng()} disabled={isExportingPng}>
          {t('actions.exportPng')}
        </Button>
      )}
    </div>
  );
}
