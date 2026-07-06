'use client';

import { useRef, type ReactNode } from 'react';
import { IconQuestion } from './icons';

export interface InfoButtonProps {
  /** Utilisé comme infobulle (survol) et libellé accessible du bouton "?". */
  label: string;
  /** Libellé du bouton de fermeture du popup. */
  closeLabel: string;
  children: ReactNode;
}

/** Petit bouton "?" qui ouvre son contenu dans un popup (élément natif `<dialog>`). */
export function InfoButton({ label, closeLabel, children }: InfoButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="rt-icon-button"
        title={label}
        aria-label={label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <IconQuestion />
      </button>
      <dialog
        ref={dialogRef}
        className="rt-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="rt-dialog-content">{children}</div>
        <button type="button" className="rt-button rt-button--secondary" onClick={() => dialogRef.current?.close()}>
          {closeLabel}
        </button>
      </dialog>
    </>
  );
}
