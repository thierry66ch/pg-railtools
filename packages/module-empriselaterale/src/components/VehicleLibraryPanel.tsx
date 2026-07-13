'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconButton, IconFolderOpen, IconPencil, IconPlus, IconTrash, NumberInput, itemLibrary } from '@railtools/commun';
import { vehicleSpecFromLibraryItem, type VehicleLibraryItem, type VehicleSpec } from '../types';

const MODULE_ID = 'empriselaterale';
const KIND = 'vehicle';

const library = itemLibrary<VehicleLibraryItem>(MODULE_ID, KIND);

function defaultDraft(): VehicleSpec {
  return {
    name: '',
    longueurCaisseMm: 280,
    largeurCaisseMaxMm: 34,
    largeurCaisseExtremiteMm: 34,
    angleBiaisExtremiteDeg: 90,
    empattementMm: 180,
  };
}

export interface VehicleLibraryPanelProps {
  onUseInProject: (item: VehicleLibraryItem) => void;
}

export function VehicleLibraryPanel({ onUseInProject }: VehicleLibraryPanelProps) {
  const t = useTranslations('moduleEmpriseLaterale');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<VehicleLibraryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VehicleSpec>(defaultDraft());

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

  function startEdit(item: VehicleLibraryItem) {
    setDraft(vehicleSpecFromLibraryItem(item));
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

  async function handleDelete(item: VehicleLibraryItem) {
    if (!window.confirm(tCommon('actions.confirmDelete'))) return;
    await library.deleteItem(item.id);
    await refresh();
  }

  return (
    <div className="rt-card">
      <h3 className="rt-section-title">{t('library.vehicles.title')}</h3>

      {items.length === 0 && editingId === null ? (
        <p className="rt-project-manager__empty">{t('library.vehicles.empty')}</p>
      ) : (
        <ul className="rt-project-list">
          {items.map((item) => (
            <li key={item.id} className="rt-project-list__item">
              <span className="rt-project-list__name">{item.name}</span>
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
            <span>{t('library.vehicles.fields.name')}</span>
            <input
              className="rt-input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.vehicles.fields.length')}</span>
            <NumberInput
              value={draft.longueurCaisseMm}
              onChange={(v) => setDraft({ ...draft, longueurCaisseMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.vehicles.fields.widthMax')}</span>
            <NumberInput
              value={draft.largeurCaisseMaxMm}
              onChange={(v) => setDraft({ ...draft, largeurCaisseMaxMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.vehicles.fields.widthEnd')}</span>
            <NumberInput
              value={draft.largeurCaisseExtremiteMm}
              onChange={(v) => setDraft({ ...draft, largeurCaisseExtremiteMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.vehicles.fields.angle')}</span>
            <NumberInput
              value={draft.angleBiaisExtremiteDeg}
              onChange={(v) => setDraft({ ...draft, angleBiaisExtremiteDeg: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('library.vehicles.fields.wheelbase')}</span>
            <NumberInput value={draft.empattementMm} onChange={(v) => setDraft({ ...draft, empattementMm: v })} />
          </label>
          <button type="button" className="rt-button" onClick={() => void saveDraft()}>
            {tCommon('actions.save')}
          </button>
          <button type="button" className="rt-button rt-button--secondary" onClick={cancelEdit}>
            {tCommon('actions.cancel')}
          </button>
        </div>
      ) : (
        <div className="rt-toolbar" style={{ marginTop: 'var(--rt-spacing-md)' }}>
          <IconButton variant="primary" label={t('library.vehicles.add')} icon={<IconPlus />} onClick={startCreate} />
        </div>
      )}
    </div>
  );
}
