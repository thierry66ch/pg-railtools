'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';
import { exportElementToPdfFile } from '../export/pdf';
import { exportResultToMarkdownFile } from '../export/markdown';
import { exportSvgToPngFile } from '../export/png';
import type { ResultData } from '../export/types';

export interface ExportButtonsProps {
  /** Nom de fichier sans extension, ex. "rayon-courbure-resultat". */
  filenameBase: string;
  /** Élément DOM contenant la page de résultat à capturer pour le PDF. */
  getResultElement: () => HTMLElement | null;
  /** Données structurées du résultat, pour l'export Markdown. */
  resultData: ResultData;
  /** Élément SVG du dessin, si le module en produit un (active le bouton PNG). */
  getSvgElement?: () => SVGSVGElement | null;
}

export function ExportButtons({
  filenameBase,
  getResultElement,
  resultData,
  getSvgElement,
}: ExportButtonsProps) {
  const t = useTranslations('common');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  async function handlePdf() {
    const element = getResultElement();
    if (!element) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdfFile(element, `${filenameBase}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleMarkdown() {
    exportResultToMarkdownFile(resultData, `${filenameBase}.md`);
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
      <Button type="button" variant="secondary" onClick={() => void handlePdf()} disabled={isExportingPdf}>
        {t('actions.exportPdf')}
      </Button>
      <Button type="button" variant="secondary" onClick={handleMarkdown}>
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
