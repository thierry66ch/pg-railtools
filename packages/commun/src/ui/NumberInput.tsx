'use client';

import { useEffect, useState } from 'react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function parseDecimal(text: string): number {
  const trimmed = text.trim();
  // `Number('')` vaut 0 (pas NaN) : sans ce garde, vider le champ pour retaper une
  // valeur committerait un 0 prématurément avant que l'utilisateur ait fini de taper.
  if (trimmed === '') return NaN;
  return Number(trimmed.replace(',', '.'));
}

/**
 * Champ numérique tolérant à la fois la virgule et le point comme séparateur décimal.
 * Certains navigateurs, sous locale FR, imposent la virgule dans un `<input type="number">`
 * et refusent le point — ce champ utilise `type="text"` pour garder le contrôle du parsing.
 */
export function NumberInput({ value, onChange, className = 'rt-input' }: NumberInputProps) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    if (parseDecimal(text) !== value) {
      setText(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(next: string) {
    setText(next);
    const parsed = parseDecimal(next);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}
