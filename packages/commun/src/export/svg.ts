/**
 * Export d'un dessin SVG (produit par un module) en fichier .svg autonome, avec les
 * dimensions réelles (mm) indiquées de deux façons : attributs `width`/`height` sur le
 * SVG (calibrage automatique) ET bandeau texte "W × H mm" dessiné en bas du fichier.
 * Le second point est nécessaire en pratique : certains logiciels CAD importent le SVG
 * mais ignorent ces attributs (repéré en usage réel), auquel cas l'utilisateur doit
 * calibrer manuellement — le bandeau lui donne la valeur exacte à saisir sans avoir à
 * mesurer sur l'échelle graduée du dessin (peu précis). Les mêmes dimensions figurent
 * aussi dans le nom du fichier téléchargé, pour rester visibles sans rouvrir le fichier.
 */

import { downloadBlob } from '../transfer/files';
import { getSvgMmSize } from './png';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const FOOTER_HEIGHT_MM = 6;
const FOOTER_MARGIN_MM = 2;
const FOOTER_FONT_SIZE_MM = 3;

function formatMm(valueMm: number): string {
  const rounded = Math.round(valueMm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export interface SvgExportSize {
  widthMm: number;
  heightMm: number;
}

/** Suffixe "WxHmm" (dimensions réelles du fichier exporté), utilisé dans son nom. */
export function formatSvgSizeSuffix(size: SvgExportSize): string {
  return `${formatMm(size.widthMm)}x${formatMm(size.heightMm)}mm`;
}

export interface SvgToSvgBlobResult {
  blob: Blob;
  size: SvgExportSize;
}

export function svgToSvgBlob(svg: SVGSVGElement, calibrationLabel = 'Dimensions export'): SvgToSvgBlobResult {
  const { x, y, width, height } = getSvgMmSize(svg);
  if (width <= 0 || height <= 0) {
    throw new Error('Impossible de déterminer les dimensions du dessin SVG à exporter.');
  }
  const totalHeightMm = height + FOOTER_HEIGHT_MM;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Bandeau ajouté SOUS le contenu existant (viewBox agrandi en hauteur, x/y/largeur
  // d'origine préservés) : jamais de chevauchement avec la géométrie du dessin, quelle
  // que soit la marge interne réservée aux cotes par le module d'origine.
  clone.setAttribute('viewBox', `${x} ${y} ${width} ${totalHeightMm}`);
  // `width`/`height` en mm réels (en plus du `viewBox`) : calibrage automatique pour les
  // logiciels CAD qui respectent ces attributs à l'import.
  clone.setAttribute('width', `${width}mm`);
  clone.setAttribute('height', `${totalHeightMm}mm`);
  // Retire le style d'affichage écran (ex. `max-width`/`height:auto` pour le layout
  // responsive de la page) : sans rapport avec le fichier exporté, potentiellement
  // trompeur pour un lecteur externe qui l'interpréterait.
  clone.removeAttribute('style');
  clone.setAttribute('xmlns', SVG_NAMESPACE);

  const footerText = document.createElementNS(SVG_NAMESPACE, 'text');
  footerText.setAttribute('x', String(x + FOOTER_MARGIN_MM));
  footerText.setAttribute('y', String(y + height + FOOTER_HEIGHT_MM / 2));
  footerText.setAttribute('font-size', String(FOOTER_FONT_SIZE_MM));
  footerText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
  footerText.setAttribute('fill', '#555555');
  footerText.setAttribute('dominant-baseline', 'middle');
  footerText.textContent = `${calibrationLabel} : ${formatMm(width)} × ${formatMm(totalHeightMm)} mm`;
  clone.appendChild(footerText);

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${serialized}`], {
    type: 'image/svg+xml',
  });

  return { blob, size: { widthMm: width, heightMm: totalHeightMm } };
}

/** `filenameBase` sans extension : le suffixe de taille et `.svg` sont ajoutés ici. */
export function exportSvgToSvgFile(svg: SVGSVGElement, filenameBase: string, calibrationLabel?: string): void {
  const { blob, size } = svgToSvgBlob(svg, calibrationLabel);
  downloadBlob(`${filenameBase}_${formatSvgSizeSuffix(size)}.svg`, blob);
}
