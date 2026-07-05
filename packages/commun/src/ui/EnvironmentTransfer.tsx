'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';
import { exportModuleEnvironment, importModuleEnvironment } from '../transfer/bulk';

export interface EnvironmentTransferProps {
  moduleId: string;
  onImported?: () => void;
}

export function EnvironmentTransfer({ moduleId, onImported }: EnvironmentTransferProps) {
  const t = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rt-toolbar">
      <Button type="button" variant="secondary" onClick={() => void exportModuleEnvironment(moduleId)}>
        {t('actions.exportEnvironment')}
      </Button>
      <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
        {t('actions.importEnvironment')}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void importModuleEnvironment(moduleId, file).then(() => onImported?.());
          event.target.value = '';
        }}
      />
    </div>
  );
}
