'use client';

import { useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react';
import { IconButton } from './IconButton';
import { IconClose, IconExpand, IconRefresh, IconZoomIn, IconZoomOut } from './icons';

const MIN_SCALE = 0.2;
const MAX_SCALE = 12;
const WHEEL_ZOOM_STEP = 1.15;
const BUTTON_ZOOM_STEP = 1.4;

export interface DrawingLightboxProps {
  /** Libellé du bouton déclencheur (infobulle + accessibilité). */
  label: string;
  closeLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  /** Contenu à afficher en grand (typiquement le même dessin SVG que sur la page). */
  children: ReactNode;
}

/**
 * Bouton "agrandir" ouvrant le dessin dans une boîte de dialogue plein écran, avec
 * zoom (molette/pincement trackpad) et déplacement (glisser-déposer à la souris).
 */
export function DrawingLightbox({
  label,
  closeLabel,
  zoomInLabel,
  zoomOutLabel,
  resetLabel,
  children,
}: DrawingLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleOpen() {
    reset();
    dialogRef.current?.showModal();
  }

  function zoomBy(factor: number) {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = { startX: event.clientX, startY: event.clientY, offsetX: offset.x, offsetY: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { startX, startY, offsetX, offsetY } = dragRef.current;
    setOffset({ x: offsetX + (event.clientX - startX), y: offsetY + (event.clientY - startY) });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <>
      <IconButton label={label} icon={<IconExpand />} onClick={handleOpen} />
      <dialog
        ref={dialogRef}
        className="rt-lightbox"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="rt-lightbox-toolbar">
          <IconButton label={zoomInLabel} icon={<IconZoomIn />} onClick={() => zoomBy(BUTTON_ZOOM_STEP)} />
          <IconButton label={zoomOutLabel} icon={<IconZoomOut />} onClick={() => zoomBy(1 / BUTTON_ZOOM_STEP)} />
          <IconButton label={resetLabel} icon={<IconRefresh />} onClick={reset} />
          <IconButton label={closeLabel} icon={<IconClose />} onClick={() => dialogRef.current?.close()} />
        </div>
        <div
          className="rt-lightbox-viewport"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div
            className="rt-lightbox-content"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
