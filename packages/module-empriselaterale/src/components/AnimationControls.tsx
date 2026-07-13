'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CalcStepMm } from '../types';

const TICK_MS = 120;

export interface AnimationControlsProps {
  sRearMm: number;
  sRearMaxMm: number;
  calcStepMm: CalcStepMm;
  onChange: (sRearMm: number) => void;
}

export function AnimationControls({ sRearMm, sRearMaxMm, calcStepMm, onChange }: AnimationControlsProps) {
  const t = useTranslations('moduleEmpriseLaterale');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onChange(Math.min(sRearMm + calcStepMm, sRearMaxMm));
    }, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, sRearMm, calcStepMm, sRearMaxMm]);

  useEffect(() => {
    if (isPlaying && sRearMm >= sRearMaxMm) {
      setIsPlaying(false);
    }
  }, [isPlaying, sRearMm, sRearMaxMm]);

  function stepBy(delta: number) {
    setIsPlaying(false);
    onChange(Math.min(Math.max(sRearMm + delta, 0), sRearMaxMm));
  }

  return (
    <div className="rt-section">
      <h3 className="rt-section-title">{t('animation.title')}</h3>
      <div className="rt-toolbar">
        <button
          type="button"
          className="rt-button"
          onClick={() => setIsPlaying((prev) => !prev)}
          disabled={sRearMaxMm <= 0}
        >
          {isPlaying ? t('animation.stop') : t('animation.play')}
        </button>
        <button type="button" className="rt-button rt-button--secondary" onClick={() => stepBy(-calcStepMm)}>
          {t('animation.stepBack')}
        </button>
        <button type="button" className="rt-button rt-button--secondary" onClick={() => stepBy(calcStepMm)}>
          {t('animation.stepForward')}
        </button>
      </div>
      <label className="rt-field">
        <span>{t('animation.position', { value: sRearMm.toFixed(0) })}</span>
        <input
          type="range"
          min={0}
          max={sRearMaxMm}
          step={calcStepMm}
          value={Math.min(sRearMm, sRearMaxMm)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
