'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconButton,
  IconCopy,
  IconDownload,
  IconFolderOpen,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
  NumberInput,
  downloadJsonFile,
  itemLibrary,
  readJsonFile,
} from '@railtools/commun';
import type { SupportType } from '../calc/arc2poly';
import type { Arc2PolyLibraryEntry } from '../types';

const MODULE_ID = 'arc2polygone';
const KIND = 'support';
/** Enveloppe de l'export JSON dédié à la bibliothèque (indépendant des projets, CDC §10.3). */
const LIBRARY_FILE_KIND = 'railtools-arc2poly-library';

const library = itemLibrary<Arc2PolyLibraryEntry>(MODULE_ID, KIND);

type Draft = Omit<Arc2PolyLibraryEntry, 'id'>;

function defaultDraft(): Draft {
  return { name: '', type: 1, B: 200, Lm: 400, jeu: 0, commentaire: '' };
}

interface LibraryFileEnvelope {
  kind: typeof LIBRARY_FILE_KIND;
  moduleId: string;
  exportedAt: string;
  items: Arc2PolyLibraryEntry[];
}

export interface Arc2PolyLibraryPanelProps {
  /** Insertion d'un modèle dans le projet courant : crée une COPIE FIGÉE (CDC §10.2). */
  onUseInProject: (entry: Arc2PolyLibraryEntry) => void;
}

export function Arc2PolyLibraryPanel({ onUseInProject }: Arc2PolyLibraryPanelProps) {
  const t = useTranslations('moduleArc2Polygone');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<Arc2PolyLibraryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(defaultDraft());
  const importInputRef = useRef<HTMLInputElement>(null);

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

  function startEdit(entry: Arc2PolyLibraryEntry) {
    const { id: _id, ...rest } = entry;
    void _id;
    setDraft({ ...rest, commentaire: rest.commentaire ?? '' });
    setEditingId(entry.id);
  }

  async function saveDraft() {
    if (!draft.name.trim()) return;
    const data: Draft = { ...draft, name: draft.name.trim() };
    if (editingId && editingId !== 'new') await library.updateItem(editingId, data);
    else await library.createItem(data);
    setEditingId(null);
    await refresh();
  }

  async function handleDuplicate(entry: Arc2PolyLibraryEntry) {
    await library.duplicateItem(entry.id);
    await refresh();
  }

  async function handleDelete(entry: Arc2PolyLibraryEntry) {
    if (!window.confirm(tCommon('actions.confirmDelete'))) return;
    await library.deleteItem(entry.id);
    await refresh();
  }

  async function handleExport() {
    const envelope: LibraryFileEnvelope = {
      kind: LIBRARY_FILE_KIND,
      moduleId: MODULE_ID,
      exportedAt: new Date().toISOString(),
      items: await library.listItems(),
    };
    downloadJsonFile(`${MODULE_ID}-bibliotheque.json`, envelope);
  }

  async function handleImportFile(file: File) {
    const envelope = await readJsonFile<LibraryFileEnvelope>(file);
    if (envelope.kind !== LIBRARY_FILE_KIND || !Array.isArray(envelope.items)) {
      window.alert(t('library.importError'));
      return;
    }
    // Import additif : chaque entrée est recréée (nouvel id) pour ne pas écraser l'existant.
    for (const entry of envelope.items) {
      const { id: _id, ...rest } = entry;
      void _id;
      await library.createItem(rest);
    }
    await refresh();
  }

  return (
    <div className="rt-card">
      <h3 className="rt-section-title">{t('library.title')}</h3>

      {items.length === 0 && editingId === null ? (
        <p className="rt-project-manager__empty">{t('library.empty')}</p>
      ) : (
        <ul className="rt-project-list">
          {items.map((entry) => (
            <li key={entry.id} className="rt-project-list__item">
              <span className="rt-project-list__name">
                {entry.name} <span style={{ color: 'var(--rt-color-text-muted)' }}>· {t(`type.t${entry.type}Short`)}</span>
              </span>
              <div className="rt-toolbar">
                <IconButton
                  variant="primary"
                  label={t('library.useInProject')}
                  icon={<IconFolderOpen />}
                  onClick={() => onUseInProject(entry)}
                />
                <IconButton label={t('library.edit')} icon={<IconPencil />} onClick={() => startEdit(entry)} />
                <IconButton label={t('library.duplicate')} icon={<IconCopy />} onClick={() => void handleDuplicate(entry)} />
                <IconButton
                  variant="danger"
                  label={t('library.delete')}
                  icon={<IconTrash />}
                  onClick={() => void handleDelete(entry)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId !== null ? (
        <div className="rt-toolbar" style={{ flexWrap: 'wrap', marginTop: 'var(--rt-spacing-md)' }}>
          <label className="rt-field">
            <span>{t('library.fields.name')}</span>
            <input className="rt-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="rt-field">
            <span>{t('library.fields.type')}</span>
            <select
              className="rt-select"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: Number(e.target.value) as SupportType })}
            >
              <option value={1}>{t('type.t1')}</option>
              <option value={2}>{t('type.t2')}</option>
              <option value={3}>{t('type.t3')}</option>
            </select>
          </label>
          <label className="rt-field">
            <span>{t('library.fields.B')}</span>
            <NumberInput value={draft.B} onChange={(v) => setDraft({ ...draft, B: v })} />
          </label>
          <label className="rt-field">
            <span>{draft.type === 3 ? t('library.fields.LmRotule') : t('library.fields.Lm')}</span>
            <NumberInput value={draft.Lm} onChange={(v) => setDraft({ ...draft, Lm: v })} />
          </label>
          {draft.type === 3 && (
            <label className="rt-field">
              <span>{t('library.fields.jeu')}</span>
              <NumberInput value={draft.jeu} onChange={(v) => setDraft({ ...draft, jeu: v })} />
            </label>
          )}
          <label className="rt-field">
            <span>{t('library.fields.commentaire')}</span>
            <input
              className="rt-input"
              value={draft.commentaire ?? ''}
              onChange={(e) => setDraft({ ...draft, commentaire: e.target.value })}
            />
          </label>
          <button type="button" className="rt-button" onClick={() => void saveDraft()}>
            {tCommon('actions.save')}
          </button>
          <button type="button" className="rt-button rt-button--secondary" onClick={() => setEditingId(null)}>
            {tCommon('actions.cancel')}
          </button>
        </div>
      ) : (
        <div className="rt-toolbar" style={{ marginTop: 'var(--rt-spacing-md)', flexWrap: 'wrap' }}>
          <IconButton variant="primary" label={t('library.add')} icon={<IconPlus />} onClick={startCreate} />
          <IconButton label={t('library.exportJson')} icon={<IconDownload />} onClick={() => void handleExport()} />
          <IconButton label={t('library.importJson')} icon={<IconUpload />} onClick={() => importInputRef.current?.click()} />
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
