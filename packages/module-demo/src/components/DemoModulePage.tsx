'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_PREFERRED_SCALE,
  DEFAULT_PREFERRED_UNIT,
  EnvironmentTransfer,
  ExportButtons,
  ProjectManager,
  ResultPageLayout,
  UnitScaleSelector,
  convertLength,
  realToScale,
  updateProject,
  type LengthUnit,
  type Project,
  type ResultData,
  type ScaleKey,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import type { DemoProjectData } from '../types';

const MODULE_ID = 'demo';

export function DemoModulePage() {
  const t = useTranslations('moduleDemo');
  const tCommon = useTranslations('common');

  const [realLengthValue, setRealLengthValue] = useState(1000);
  const [unit, setUnit] = useState<LengthUnit>(DEFAULT_PREFERRED_UNIT);
  const [scale, setScale] = useState<ScaleKey>(DEFAULT_PREFERRED_SCALE);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const resultRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const realLengthMm = convertLength(realLengthValue, unit, 'mm');
  const modelLengthMm = realToScale(realLengthMm, scale);
  const railHeightMm = Math.max(modelLengthMm * 0.05, 2);

  const resultData: ResultData = useMemo(
    () => ({
      title: t('title'),
      description: t('description'),
      table: {
        headers: [t('result.realLength'), t('result.scale'), t('result.modelLength')],
        rows: [[`${realLengthMm.toFixed(1)} mm`, scale, `${modelLengthMm.toFixed(2)} mm`]],
      },
    }),
    [t, realLengthMm, scale, modelLengthMm],
  );

  function handleOpen(project: Project<DemoProjectData>) {
    setRealLengthValue(project.data.realLengthMm);
    setUnit('mm');
    setScale(project.data.scale);
    setActiveProjectId(project.id);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<DemoProjectData>(MODULE_ID, activeProjectId, { realLengthMm, scale });
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('form.realLength')}</span>
          <input
            className="rt-input"
            type="number"
            min={1}
            value={realLengthValue}
            onChange={(event) => setRealLengthValue(Number(event.target.value))}
          />
        </label>
        <UnitScaleSelector
          onChange={({ unit: nextUnit, scale: nextScale }) => {
            setUnit(nextUnit);
            setScale(nextScale);
          }}
        />
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      <div ref={resultRef}>
        <table>
          <thead>
            <tr>
              {resultData.table?.headers.map((header) => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {resultData.table?.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${Math.max(modelLengthMm, 1)} ${Math.max(railHeightMm, 1)}`}
          width="100%"
          style={{ maxWidth: 480, height: 'auto', background: 'transparent' }}
        >
          <rect x={0} y={0} width={modelLengthMm} height={railHeightMm} fill="#1f5f8b" />
        </svg>
      </div>

      <ExportButtons
        filenameBase={`demo-rail-${scale}`}
        resultData={resultData}
        getResultElement={() => resultRef.current}
        getSvgElement={() => svgRef.current}
      />

      <ProjectManager<DemoProjectData>
        moduleId={MODULE_ID}
        activeProjectId={activeProjectId}
        createDefaultData={() => ({ realLengthMm, scale })}
        onOpen={handleOpen}
      />

      <EnvironmentTransfer moduleId={MODULE_ID} />
    </ResultPageLayout>
  );
}
