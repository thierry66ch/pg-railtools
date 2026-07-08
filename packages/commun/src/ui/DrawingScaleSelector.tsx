'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_DRAWING_SCALE,
  DRAWING_SCALE_RATIOS,
  getPreferredDrawingScale,
  setPreferredDrawingScale,
  type DrawingScale,
} from '../drawing/scale';

const FIT_OPTION = 'fit';

export interface DrawingScaleSelectorProps {
  /** Mode contrôlé : si fourni, le composant n'utilise pas la préférence globale. */
  value?: DrawingScale;
  onChange?: (value: DrawingScale) => void;
  className?: string;
}

export function DrawingScaleSelector({ value, onChange, className = 'rt-field' }: DrawingScaleSelectorProps) {
  const t = useTranslations('common');
  const [internal, setInternal] = useState<DrawingScale>(DEFAULT_DRAWING_SCALE);
  const current = value ?? internal;

  useEffect(() => {
    if (value === undefined) {
      void getPreferredDrawingScale().then(setInternal);
    }
  }, [value]);

  async function handleChange(next: DrawingScale) {
    if (value === undefined) {
      setInternal(next);
      await setPreferredDrawingScale(next);
    }
    onChange?.(next);
  }

  function handleSelect(raw: string) {
    if (raw === FIT_OPTION) {
      void handleChange({ mode: 'fit', fitTargetMm: current.fitTargetMm });
    } else {
      void handleChange({ mode: 'fixed', ratio: Number(raw) });
    }
  }

  const selectValue = current.mode === 'fit' ? FIT_OPTION : String(current.ratio ?? 1);

  return (
    <label className={className}>
      <span>{t('drawing.scale.label')}</span>
      <select
        className="rt-select"
        value={selectValue}
        onChange={(event) => handleSelect(event.target.value)}
      >
        <option value={FIT_OPTION}>{t('drawing.scale.fit')}</option>
        {DRAWING_SCALE_RATIOS.map((ratio) => (
          <option key={ratio} value={ratio}>
            1:{ratio}
          </option>
        ))}
      </select>
    </label>
  );
}
