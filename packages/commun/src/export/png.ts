/**
 * Export d'un dessin SVG (produit par un module) en PNG à l'échelle, fond transparent.
 */

import { downloadBlob } from '../transfer/files';

/**
 * Taille et origine (mm de dessin) du SVG, lues depuis son `viewBox` (1 unité SVG = 1 mm
 * de dessin). `x`/`y` correspondent à la marge interne éventuelle du viewBox (ex. réservée
 * pour les cotes) — utile pour aligner le *contenu* du dessin (pas le bord de l'image
 * rasterisée, qui inclut cette marge) avec d'autres éléments lors d'un export.
 */
export function getSvgMmSize(svg: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const viewBox = svg.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
  }
  const bbox = svg.getBBox();
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
}

/**
 * Bounding box réel (mm de dessin) du contenu effectivement rendu dans un SVG, dans le même
 * repère que son `viewBox` — contrairement à `getSvgMmSize` (qui renvoie le `viewBox`
 * déclaré, dont la marge interne fixe, ex. réservée aux cotes, dépasse souvent ce qui est
 * réellement dessiné). Sert à aligner le bord du contenu réel (pas la marge réservée) avec
 * une marge de page à l'export : utiliser `viewBox.x`/`viewBox.y` pour ce calcul suppose
 * que le contenu utilise toute la marge réservée, ce qui n'est vrai que dans le pire cas et
 * pousse sinon le contenu réel au-delà de la marge de page voulue (voir pieges-a-eviter.md).
 */
export function getSvgContentBBoxMm(svg: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const bbox = svg.getBBox();
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
}

/**
 * Budget de pixels raisonnable pour un canvas d'export PNG. Bien en-dessous de la limite
 * de la plupart des navigateurs (~268 mégapixels sous Chromium) pour rester rapide et
 * garder une marge de sécurité, tout en couvrant largement les besoins d'export courants.
 */
const MAX_CANVAS_PIXELS = 32_000_000;

export async function svgToPngBlob(svg: SVGSVGElement, scaleFactor = 4): Promise<Blob> {
  const { width, height } = getSvgMmSize(svg);
  if (width <= 0 || height <= 0) {
    throw new Error('Impossible de déterminer les dimensions du dessin SVG à exporter.');
  }

  // Un dessin à grande échelle (ex. 1:1 sur une géométrie de plusieurs mètres) peut produire
  // un canvas dépassant la limite du navigateur (cf. pieges-a-eviter.md, "Export PNG/PDF :
  // limiter la taille du canvas") : on réduit l'échelle effective pour rester dans un budget
  // de pixels raisonnable, plutôt que de laisser l'export planter.
  const requestedPixels = width * scaleFactor * height * scaleFactor;
  const effectiveScaleFactor =
    requestedPixels > MAX_CANVAS_PIXELS
      ? scaleFactor * Math.sqrt(MAX_CANVAS_PIXELS / requestedPixels)
      : scaleFactor;

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
  canvas.width = Math.max(1, Math.round(width * effectiveScaleFactor));
  canvas.height = Math.max(1, Math.round(height * effectiveScaleFactor));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte de rendu Canvas 2D indisponible.');
  }
  // Le canvas est transparent par défaut : ne pas remplir de fond avant de dessiner.
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else
        reject(
          new Error(
            "Échec de la génération du PNG : dessin trop grand pour l'export à cette échelle. Choisissez une échelle plus petite ou le mode « Ajustée à la page ».",
          ),
        );
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
