'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';
import {
  createProject,
  deleteProject,
  duplicateProject,
  exportProjectToFile,
  importProjectFromFile,
  listProjects,
  renameProject,
  type Project,
} from '../projects';

export interface ProjectManagerProps<T> {
  moduleId: string;
  activeProjectId?: string;
  /** Fournit les données initiales d'un nouveau projet. */
  createDefaultData: () => T;
  onOpen: (project: Project<T>) => void;
}

export function ProjectManager<T>({
  moduleId,
  activeProjectId,
  createDefaultData,
  onOpen,
}: ProjectManagerProps<T>) {
  const t = useTranslations('common');
  const [projects, setProjects] = useState<Project<T>[]>([]);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setProjects(await listProjects<T>(moduleId));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const project = await createProject(moduleId, name, createDefaultData());
    setNewName('');
    await refresh();
    onOpen(project);
  }

  async function handleRename(project: Project<T>) {
    const next = window.prompt(t('projects.rename'), project.name);
    if (!next || next === project.name) return;
    await renameProject(moduleId, project.id, next);
    await refresh();
  }

  async function handleDuplicate(project: Project<T>) {
    await duplicateProject(moduleId, project.id);
    await refresh();
  }

  async function handleDelete(project: Project<T>) {
    if (!window.confirm(t('actions.confirmDelete'))) return;
    await deleteProject(moduleId, project.id);
    await refresh();
  }

  async function handleImportFile(file: File) {
    await importProjectFromFile<T>(moduleId, file);
    await refresh();
  }

  return (
    <div className="rt-card">
      <h3>{t('projects.title')}</h3>

      <div className="rt-toolbar">
        <input
          className="rt-input"
          placeholder={t('projects.namePlaceholder')}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="button" onClick={() => void handleCreate()}>
          {t('projects.new')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          {t('actions.importProject')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {projects.length === 0 ? (
        <p>{t('projects.empty')}</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id} aria-current={project.id === activeProjectId}>
              <span>{project.name}</span>
              <div className="rt-toolbar">
                <Button type="button" variant="secondary" onClick={() => onOpen(project)}>
                  {t('projects.open')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void handleRename(project)}>
                  {t('projects.rename')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void handleDuplicate(project)}>
                  {t('projects.duplicate')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void exportProjectToFile(moduleId, project.id)}
                >
                  {t('actions.exportProject')}
                </Button>
                <Button type="button" variant="danger" onClick={() => void handleDelete(project)}>
                  {t('projects.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
