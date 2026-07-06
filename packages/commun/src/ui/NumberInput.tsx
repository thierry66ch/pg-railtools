'use client';

import { useEffect, useState } from 'react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function parseDecimal(text: string): number {
  return Number(text.trim().replace(',', '.'));
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
