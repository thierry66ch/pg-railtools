'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconButton } from './IconButton';
import { IconCopy, IconDownload, IconFolderOpen, IconPencil, IconPlus, IconTrash, IconUpload } from './icons';
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
        <IconButton
          variant="primary"
          label={t('projects.new')}
          icon={<IconPlus />}
          onClick={() => void handleCreate()}
        />
        <IconButton
          label={t('actions.importProject')}
          icon={<IconUpload />}
          onClick={() => fileInputRef.current?.click()}
        />
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
                <IconButton label={t('projects.open')} icon={<IconFolderOpen />} onClick={() => onOpen(project)} />
                <IconButton
                  label={t('projects.rename')}
                  icon={<IconPencil />}
                  onClick={() => void handleRename(project)}
                />
                <IconButton
                  label={t('projects.duplicate')}
                  icon={<IconCopy />}
                  onClick={() => void handleDuplicate(project)}
                />
                <IconButton
                  label={t('actions.exportProject')}
                  icon={<IconDownload />}
                  onClick={() => void exportProjectToFile(moduleId, project.id)}
                />
                <IconButton
                  variant="danger"
                  label={t('projects.delete')}
                  icon={<IconTrash />}
                  onClick={() => void handleDelete(project)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
