'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconButton, IconFolderOpen, IconPencil, IconPlus, IconTrash, NumberInput, itemLibrary } from '@railtools/commun';
import type { TrackElementLibraryItem, TrackSegmentType } from '../types';

const MODULE_ID = 'empriselaterale';
const KIND = 'trackElement';

const library = itemLibrary<TrackElementLibraryItem>(MODULE_ID, KIND);

type Draft = Omit<TrackElementLibraryItem, 'id'>;

function defaultDraft(): Draft {
  return { name: '', type: 'line', lengthMm: 400, radiusMm: 600, angleDeg: 30 };
}

export interface TrackElementLibraryPanelProps {
  onUseInProject: (item: TrackElementLibraryItem) => void;
}

export function TrackElementLibraryPanel({ onUseInProject }: TrackElementLibraryPanelProps) {
  const t = useTranslations('moduleEmpriseLaterale');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<TrackElementLibraryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(defaultDraft());

  async function refresh() {
    setItems(await library.listItems());
  }

  useEffect(() => {
    void refresh();
  }, []);

  function startCreate() {
    setDraft(defaultDraft());
    setEditingId('new');
  }

  function startEdit(item: TrackElementLibraryItem) {
    const { id: _id, ...rest } = item;
    setDraft(rest);
    setEditingId(item.id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveDraft() {
    if (!draft.name.trim()) return;
    if (editingId && editingId !== 'new') {
      await library.updateItem(editingId, draft);
    } else {
      await library.createItem(draft);
    }
    setEditingId(null);
    await refresh();
  }

  async function handleDelete(item: TrackElementLibraryItem) {
    if (!window.confirm(tCommon('actions.confirmDelete'))) return;
    await library.deleteItem(item.id);
    await refresh();
  }

  function describe(item: TrackElementLibraryItem): string {
    return item.type === 'line'
      ? t('library.trackElements.summaryLine', { length: item.lengthMm ?? 0 })
      : t('library.trackElements.summaryCurve', { radius: item.radiusMm ?? 0, angle: item.angleDeg ?? 0 });
  }

  return (
    <div className="rt-card">
      <h3 className="rt-section-title">{t('library.trackElements.title')}</h3>

      {items.length === 0 && editingId === null ? (
        <p className="rt-project-manager__empty">{t('library.trackElements.empty')}</p>
      ) : (
        <ul className="rt-project-list">
          {items.map((item) => (
            <li key={item.id} className="rt-project-list__item">
              <span className="rt-project-list__name">
                {item.name} — {describe(item)}
              </span>
              <div className="rt-toolbar">
                <IconButton
                  variant="primary"
                  label={t('library.useInProject')}
                  icon={<IconFolderOpen />}
                  onClick={() => onUseInProject(item)}
                />
                <IconButton label={t('library.edit')} icon={<IconPencil />} onClick={() => startEdit(item)} />
                <IconButton
                  variant="danger"
                  label={t('library.delete')}
                  icon={<IconTrash />}
                  onClick={() => void handleDelete(item)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId !== null ? (
        <div className="rt-toolbar" style={{ flexWrap: 'wrap', marginTop: 'var(--rt-spacing-md)' }}>
          <label className="rt-field">
            <span>{t('library.trackElements.fields.name')}</span>
            <input
              className="rt-input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.trackElements.fields.type')}</span>
            <select
              className="rt-select"
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as TrackSegmentType })}
            >
              <option value="line">{t('trackSegment.type.line')}</option>
              <option value="curve">{t('trackSegment.type.curve')}</option>
            </select>
          </label>
          {draft.type === 'line' ? (
            <label className="rt-field">
              <span>{t('library.trackElements.fields.length')}</span>
              <NumberInput value={draft.lengthMm ?? 0} onChange={(v) => setDraft({ ...draft, lengthMm: v })} />
            </label>
          ) : (
            <>
              <label className="rt-field">
                <span>{t('library.trackElements.fields.radius')}</span>
                <NumberInput value={draft.radiusMm ?? 0} onChange={(v) => setDraft({ ...draft, radiusMm: v })} />
              </label>
              <label className="rt-field">
                <span>{t('library.trackElements.fields.angle')}</span>
                <NumberInput value={draft.angleDeg ?? 0} onChange={(v) => setDraft({ ...draft, angleDeg: v })} />
              </label>
            </>
          )}
          <button type="button" className="rt-button" onClick={() => void saveDraft()}>
            {tCommon('actions.save')}
          </button>
          <button type="button" className="rt-button rt-button--secondary" onClick={cancelEdit}>
            {tCommon('actions.cancel')}
          </button>
        </div>
      ) : (
        <div className="rt-toolbar" style={{ marginTop: 'var(--rt-spacing-md)' }}>
          <IconButton
            variant="primary"
            label={t('library.trackElements.add')}
            icon={<IconPlus />}
            onClick={startCreate}
          />
        </div>
      )}
    </div>
  );
}
