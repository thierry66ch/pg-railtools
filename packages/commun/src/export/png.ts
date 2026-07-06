/**
 * Export d'un dessin SVG (produit par un module) en PNG à l'échelle, fond transparent.
 */

import { downloadBlob } from '../transfer/files';

/** Taille (mm de dessin) du SVG, lue depuis son `viewBox` (1 unité SVG = 1 mm de dessin). */
export function getSvgMmSize(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const bbox = svg.getBBox();
  return { width: bbox.width, height: bbox.height };
}

export async function svgToPngBlob(svg: SVGSVGElement, scaleFactor = 4): Promise<Blob> {
  const { width, height } = getSvgMmSize(svg);
  if (width <= 0 || height <= 0) {
    throw new Error('Impossible de déterminer les dimensions du dessin SVG à exporter.');
  }

  const serialized = new XMLSerializer().serializeToString(svg);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Échec du chargement du SVG pour export PNG.'));
  });
  image.src = svgDataUrl;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scaleFactor);
  canvas.height = Math.round(height * scaleFactor);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte de rendu Canvas 2D indisponible.');
  }
  // Le canvas est transparent par défaut : ne pas remplir de fond avant de dessiner.
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Échec de la génération du PNG.'));
    }, 'image/png');
  });
}

/**
 * Rasterise un SVG arbitraire (donné sous forme de balisage, pas de dimensions "mm de
 * dessin") en PNG carré, encodé en data URL — utile pour embarquer un logo/icône
 * statique (ex. dans un cartouche PDF), indépendamment du système d'échelle de dessin.
 */
export async function svgMarkupToPngDataUrl(svgMarkup: string, sizePx: number): Promise<string> {
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Échec du chargement du SVG.'));
  });
  image.src = svgDataUrl;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte de rendu Canvas 2D indisponible.');
  }
  ctx.drawImage(image, 0, 0, sizePx, sizePx);

  return canvas.toDataURL('image/png');
}

export async function exportSvgToPngFile(
  svg: SVGSVGElement,
  filename: string,
  scaleFactor = 4,
): Promise<void> {
  const blob = await svgToPngBlob(svg, scaleFactor);
  downloadBlob(filename, blob);
}
