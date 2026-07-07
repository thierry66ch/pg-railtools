'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NumberInput, ResultPageLayout } from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  computeImplantation,
  localOffset,
  radiusFromChordSagitta,
  sagittaFromRadiusChord,
} from '../math/arc';
import type { ArcInputMode } from '../types';

const DEFAULT_CHORD_MM = 1000;
const DEFAULT_SAGITTA_MM = 50;
const DEFAULT_RADIUS_MM = 2500;
const DEFAULT_INTERVALS = 10;
const DEFAULT_DECIMALS = 3;
const MIN_INTERVALS = 2;
const MAX_DECIMALS = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function ArcModulePage() {
  const t = useTranslations('moduleArc');

  const [inputMode, setInputMode] = useState<ArcInputMode>('chordSagitta');
  const [chordMm, setChordMm] = useState(DEFAULT_CHORD_MM);
  const [sagittaMm, setSagittaMm] = useState(DEFAULT_SAGITTA_MM);
  const [radiusMm, setRadiusMm] = useState(DEFAULT_RADIUS_MM);
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);
  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);
  const [showArcLength, setShowArcLength] = useState(true);
  const [cursorAeMm, setCursorAeMm] = useState(DEFAULT_CHORD_MM / 2);

  const primaryResult =
    inputMode === 'chordSagitta'
      ? radiusFromChordSagitta(chordMm, sagittaMm)
      : sagittaFromRadiusChord(radiusMm, chordMm);

  const effectiveRadiusMm =
    inputMode === 'chordSagitta' ? (primaryResult.ok ? primaryResult.value : undefined) : radiusMm;
  const effectiveSagittaMm =
    inputMode === 'chordSagitta' ? sagittaMm : primaryResult.ok ? primaryResult.value : undefined;

  const tableResult = primaryResult.ok
    ? computeImplantation(effectiveRadiusMm as number, chordMm, intervals)
    : undefined;

  const clampedCursorAeMm = clamp(cursorAeMm, 0, chordMm);
  const cursorOffsetMm = primaryResult.ok
    ? localOffset(clampedCursorAeMm, effectiveRadiusMm as number, chordMm, effectiveSagittaMm as number)
    : undefined;

  function handleIntervalsChange(next: number) {
    setIntervals(Math.max(MIN_INTERVALS, Math.round(next)));
  }

  function handleDecimalsChange(next: number) {
    setDecimals(clamp(Math.round(next), 0, MAX_DECIMALS));
  }

  function handleCursorChange(next: number) {
    setCursorAeMm(clamp(next, 0, chordMm));
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('mode.label')}</span>
          <select
            className="rt-select"
            value={inputMode}
            onChange={(event) => setInputMode(event.target.value as ArcInputMode)}
          >
            <option value="chordSagitta">{t('mode.chordSagitta')}</option>
            <option value="radiusChord">{t('mode.radiusChord')}</option>
          </select>
        </label>
        <label className="rt-field">
          <span>{t('form.chord')}</span>
          <NumberInput value={chordMm} onChange={setChordMm} />
        </label>
        {inputMode === 'chordSagitta' ? (
          <label className="rt-field">
            <span>{t('form.sagitta')}</span>
            <NumberInput value={sagittaMm} onChange={setSagittaMm} />
          </label>
        ) : (
          <label className="rt-field">
            <span>{t('form.radius')}</span>
            <NumberInput value={radiusMm} onChange={setRadiusMm} />
          </label>
        )}
      </div>

      {!primaryResult.ok && <p className="rt-error">{t(`errors.${primaryResult.error}`)}</p>}

      {primaryResult.ok && (
        <>
          <p>
            {inputMode === 'chordSagitta'
              ? `${t('result.radius')} : ${formatNumber(effectiveRadiusMm as number, decimals)} mm`
              : `${t('result.sagitta')} : ${formatNumber(effectiveSagittaMm as number, decimals)} mm`}
          </p>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.intervals')}</span>
              <NumberInput value={intervals} onChange={handleIntervalsChange} />
            </label>
            <label className="rt-field">
              <span>{t('form.decimals')}</span>
              <NumberInput value={decimals} onChange={handleDecimalsChange} />
            </label>
            <label className="rt-field">
              <span>{t('form.showArcLength')}</span>
              <input
                type="checkbox"
                checked={showArcLength}
                onChange={(event) => setShowArcLength(event.target.checked)}
              />
            </label>
          </div>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.cursorPosition')}</span>
              <NumberInput value={clampedCursorAeMm} onChange={handleCursorChange} />
            </label>
            {cursorOffsetMm !== undefined && (
              <p>
                {t('result.cursorOffset')} : {formatNumber(cursorOffsetMm, decimals)} mm
              </p>
            )}
          </div>

          {tableResult?.ok && (
            <table>
              <caption>{t('table.title')}</caption>
              <thead>
                <tr>
                  <th>{t('table.index')}</th>
                  <th>{t('table.ae')}</th>
                  <th>{t('table.eb')}</th>
                  <th>{t('table.ef')}</th>
                  {showArcLength && <th>{t('table.arcLength')}</th>}
                </tr>
              </thead>
              <tbody>
                {tableResult.value.points.map((point) => (
                  <tr key={point.index}>
                    <td>{point.index}</td>
                    <td>{formatNumber(point.aeMm, decimals)}</td>
                    <td>{formatNumber(point.ebMm, decimals)}</td>
                    <td>{formatNumber(point.efMm, decimals)}</td>
                    {showArcLength && <td>{formatNumber(point.arcLengthMm, decimals)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </ResultPageLayout>
  );
}
