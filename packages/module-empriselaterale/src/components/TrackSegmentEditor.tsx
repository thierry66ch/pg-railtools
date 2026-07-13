'use client';

import { useTranslations } from 'next-intl';
import { IconButton, IconTrash, NumberInput } from '@railtools/commun';
import type { TrackDirection, TrackSegment, TrackSegmentType } from '../types';

export interface TrackSegmentEditorProps {
  segment: TrackSegment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onChange: (segment: TrackSegment) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function defaultForType(type: TrackSegmentType): TrackSegment {
  return type === 'line'
    ? { type: 'line', lengthMm: 400 }
    : { type: 'curve', radiusMm: 600, angleDeg: 30, direction: 'left' };
}

export function TrackSegmentEditor({
  segment,
  index,
  isFirst,
  isLast,
  canRemove,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TrackSegmentEditorProps) {
  const t = useTranslations('moduleEmpriseLaterale');

  return (
    <div
      style={{
        border: '1px solid var(--rt-color-border)',
        borderRadius: 'var(--rt-radius)',
        padding: 'var(--rt-spacing-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--rt-spacing-sm)',
      }}
    >
      <div className="rt-toolbar" style={{ justifyContent: 'space-between' }}>
        <strong>{t('trackSegment.title', { index: index + 1 })}</strong>
        <div className="rt-toolbar">
          <button
            type="button"
            className="rt-icon-button"
            aria-label={t('trackSegment.moveUp')}
            title={t('trackSegment.moveUp')}
            disabled={isFirst}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="rt-icon-button"
            aria-label={t('trackSegment.moveDown')}
            title={t('trackSegment.moveDown')}
            disabled={isLast}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <IconButton
            variant="danger"
            label={t('trackSegment.remove')}
            icon={<IconTrash />}
            disabled={!canRemove}
            onClick={onRemove}
          />
        </div>
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('trackSegment.fields.type')}</span>
          <select
            className="rt-select"
            value={segment.type}
            onChange={(event) => onChange(defaultForType(event.target.value as TrackSegmentType))}
          >
            <option value="line">{t('trackSegment.type.line')}</option>
            <option value="curve">{t('trackSegment.type.curve')}</option>
          </select>
        </label>

        {segment.type === 'line' ? (
          <label className="rt-field">
            <span>{t('trackSegment.fields.length')}</span>
            <NumberInput
              value={segment.lengthMm ?? 0}
              onChange={(v) => onChange({ ...segment, lengthMm: v })}
            />
          </label>
        ) : (
          <>
            <label className="rt-field">
              <span>{t('trackSegment.fields.radius')}</span>
              <NumberInput value={segment.radiusMm ?? 0} onChange={(v) => onChange({ ...segment, radiusMm: v })} />
            </label>
            <label className="rt-field">
              <span>{t('trackSegment.fields.angle')}</span>
              <NumberInput value={segment.angleDeg ?? 0} onChange={(v) => onChange({ ...segment, angleDeg: v })} />
            </label>
            <label className="rt-field">
              <span>{t('trackSegment.fields.direction')}</span>
              <select
                className="rt-select"
                value={segment.direction ?? 'left'}
                onChange={(event) => onChange({ ...segment, direction: event.target.value as TrackDirection })}
              >
                <option value="left">{t('trackSegment.direction.left')}</option>
                <option value="right">{t('trackSegment.direction.right')}</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}
