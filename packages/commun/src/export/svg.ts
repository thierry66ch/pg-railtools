/**
 * Export d'un dessin SVG (produit par un module) en fichier .svg autonome et calibré à
 * l'échelle réelle du dessin, pour un import direct dans un logiciel CAD sans calibrage
 * manuel — contrairement à un PNG rastérisé, qui n'embarque aucune métadonnée d'échelle
 * fiable.
 */

import { downloadBlob } from '../transfer/files';
import { getSvgMmSize } from './png';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function svgToSvgBlob(svg: SVGSVGElement): Blob {
  const { width, height } = getSvgMmSize(svg);
  if (width <= 0 || height <= 0) {
    throw new Error('Impossible de déterminer les dimensions du dessin SVG à exporter.');
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // `width`/`height` en mm réels (en plus du `viewBox`, déjà en mm) : un logiciel CAD lit
  // ces attributs pour placer le contenu à l'échelle 1:1 dès l'import, sans calibrage
  // manuel — le point bloquant que l'export PNG ne résout pas.
  clone.setAttribute('width', `${width}mm`);
  clone.setAttribute('height', `${height}mm`);
  // Retire le style d'affichage écran (ex. `max-width`/`height:auto` pour le layout
  // responsive de la page) : sans rapport avec le fichier exporté, potentiellement
  // trompeur pour un lecteur externe qui l'interpréterait.
  clone.removeAttribute('style');
  clone.setAttribute('xmlns', SVG_NAMESPACE);

  const serialized = new XMLSerializer().serializeToString(clone);
  return new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${serialized}`], {
    type: 'image/svg+xml',
  });
}

export function exportSvgToSvgFile(svg: SVGSVGElement, filename: string): void {
  const blob = svgToSvgBlob(svg);
  downloadBlob(filename, blob);
}
