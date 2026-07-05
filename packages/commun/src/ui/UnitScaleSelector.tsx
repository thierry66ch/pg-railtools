'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_PREFERRED_SCALE,
  DEFAULT_PREFERRED_UNIT,
  getPreferredScale,
  getPreferredUnit,
  SCALE_KEYS,
  SCALES,
  setPreferredScale,
  setPreferredUnit,
  type LengthUnit,
  type ScaleKey,
} from '../units';

const UNITS: LengthUnit[] = ['mm', 'cm', 'm'];

export interface UnitScaleSelectorProps {
  onChange?: (value: { unit: LengthUnit; scale: ScaleKey }) => void;
}

export function UnitScaleSelector({ onChange }: UnitScaleSelectorProps) {
  const t = useTranslations('common');
  const [unit, setUnit] = useState<LengthUnit>(DEFAULT_PREFERRED_UNIT);
  const [scale, setScale] = useState<ScaleKey>(DEFAULT_PREFERRED_SCALE);

  useEffect(() => {
    void getPreferredUnit().then(setUnit);
    void getPreferredScale().then(setScale);
  }, []);

  async function handleUnitChange(next: LengthUnit) {
    setUnit(next);
    await setPreferredUnit(next);
    onChange?.({ unit: next, scale });
  }

  async function handleScaleChange(next: ScaleKey) {
    setScale(next);
    await setPreferredScale(next);
    onChange?.({ unit, scale: next });
  }

  return (
    <div className="rt-toolbar">
      <label className="rt-field">
        <span>{t('units.unit')}</span>
        <select
          className="rt-select"
          value={unit}
          onChange={(event) => void handleUnitChange(event.target.value as LengthUnit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="rt-field">
        <span>{t('units.scale')}</span>
        <select
          className="rt-select"
          value={scale}
          onChange={(event) => void handleScaleChange(event.target.value as ScaleKey)}
        >
          {SCALE_KEYS.map((key) => (
            <option key={key} value={key}>
              {SCALES[key].label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
