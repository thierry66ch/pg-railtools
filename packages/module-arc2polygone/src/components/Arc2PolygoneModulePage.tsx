'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_DRAWING_SCALE,
  EnvironmentTransfer,
  ExportButtons,
  NumberInput,
  ProjectManager,
  ResultPageLayout,
  updateProject,
  type Project,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import { computeArc2Poly, type SupportType } from '../calc/arc2poly';
import type { Arc2PolyProjectData } from '../types';

const MODULE_ID = 'arc2polygone';

const DEFAULT_RA_MM = 2000;
const DEFAULT_B_MM = 200;
const DEFAULT_LM_MM = 400;
const DEFAULT_BETA_DEG = 90;
const DEFAULT_J_MM = 0;

/** Arrondit puis évite l'artefact "-0.000" (zéro négatif issu d'une imprécision flottante). */
function formatFixed(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.startsWith('-') && Number(fixed) === 0 ? fixed.slice(1) : fixed;
}

/** Longueurs : arrondi au millimètre (CDC §8.1). */
function formatLen(mm: number): string {
  return formatFixed(mm, 0);
}

/** Angles : degrés décimaux au dixième de degré (CDC §8.1). */
function formatAng(deg: number): string {
  return formatFixed(deg, 1);
}

/** Une ligne du tableau de résultats (grandeur → valeur). `given` = valeur saisie (gras). */
interface ResultRow {
  labelKey: string;
  value: string;
  given: boolean;
}

export function Arc2PolygoneModulePage() {
  const t = useTranslations('moduleArc2Polygone');
  const tCommon = useTranslations('common');

  const [type, setType] = useState<SupportType>(1);
  const [Ra, setRa] = useState(DEFAULT_RA_MM);
  const [B, setB] = useState(DEFAULT_B_MM);
  const [Lm, setLm] = useState(DEFAULT_LM_MM);
  const [beta, setBeta] = useState(DEFAULT_BETA_DEG);
  const [j, setJ] = useState(DEFAULT_J_MM);
  const [showOverhangCotes, setShowOverhangCotes] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  // Remonte ProjectManager (via sa `key`) après un import en vrac / un enregistrement, pour
  // qu'il relise sa liste — sinon elle reste périmée (voir pieges-a-eviter.md).
  const [projectListVersion, setProjectListVersion] = useState(0);

  const outcome = computeArc2Poly({ type, Ra, B, Lm, beta, j: type === 3 ? j : undefined });

  // Construit les lignes du tableau en masquant les grandeurs non pertinentes selon le type
  // (CDC §8.2 : colonnes non pertinentes masquées, pas affichées vides ou à zéro).
  let rows: ResultRow[] = [];
  if (outcome.ok) {
    const r = outcome.result;
    rows = [
      { labelKey: 'alpha', value: formatAng(r.alphaDeg), given: false },
      { labelKey: 'Ra', value: formatLen(Ra), given: true },
      { labelKey: 'Rm', value: formatLen(r.Rm), given: false },
      { labelKey: 'Ri', value: formatLen(r.Ri), given: false },
      { labelKey: 'Re', value: formatLen(r.Re), given: false },
    ];
    if (type === 1) {
      rows.push(
        { labelKey: 'Li', value: formatLen(r.Li ?? 0), given: false },
        { labelKey: 'Lm', value: formatLen(Lm), given: true },
        { labelKey: 'Le', value: formatLen(r.Le ?? 0), given: false },
        { labelKey: 'coupe', value: formatAng(r.coupeDeg ?? 0), given: false },
      );
    }
    if (type === 2) {
      rows.push({ labelKey: 'O', value: formatLen(r.O ?? 0), given: false });
    }
    if (type === 2 || type === 3) {
      rows.push({ labelKey: 'rentrant', value: formatAng(r.rentrantDeg ?? 0), given: false });
    }
    rows.push(
      { labelKey: 'EiMin', value: formatLen(r.EiMin), given: false },
      { labelKey: 'EiMax', value: formatLen(r.EiMax), given: false },
      { labelKey: 'EeMin', value: formatLen(r.EeMin), given: false },
      { labelKey: 'EeMax', value: formatLen(r.EeMax), given: false },
      { labelKey: 'n', value: String(r.n), given: false },
    );
  }

  // Message de découpage (CDC §6) : arc couvert exactement, ou élément spécial à ajuster.
  const residualNote = outcome.ok
    ? outcome.result.exactlyCovered
      ? t('result.exactlyCovered', { n: outcome.result.n })
      : t('result.specialElement', {
          betar: formatAng(outcome.result.betaResidualDeg),
          chord: formatLen(outcome.result.residualChord),
        })
    : undefined;

  const resultData: ResultData | undefined = outcome.ok
    ? {
        title: t('title'),
        table: {
          headers: [t('result.designation'), t('result.value')],
          rows: rows.map((row) => [t(`result.${row.labelKey}`), row.value]),
          boldCells: rows.map((row) => [false, row.given]),
        },
        notes: residualNote ? [residualNote] : undefined,
      }
    : undefined;

  function createDefaultData(): Arc2PolyProjectData {
    return {
      type,
      Ra,
      B,
      Lm,
      beta,
      j,
      drawingScale: DEFAULT_DRAWING_SCALE,
      showOverhangCotes,
    };
  }

  function handleOpen(project: Project<Arc2PolyProjectData>) {
    const d = project.data;
    setType(d.type);
    setRa(d.Ra);
    setB(d.B);
    setLm(d.Lm);
    setBeta(d.beta);
    setJ(d.j);
    setShowOverhangCotes(d.showOverhangCotes);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<Arc2PolyProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    setProjectListVersion((v) => v + 1);
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('type.label')}</span>
          <select
            className="rt-select"
            value={type}
            onChange={(event) => setType(Number(event.target.value) as SupportType)}
          >
            <option value={1}>{t('type.t1')}</option>
            <option value={2}>{t('type.t2')}</option>
            <option value={3}>{t('type.t3')}</option>
          </select>
        </label>
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('form.Ra')}</span>
          <NumberInput value={Ra} onChange={setRa} />
        </label>
        <label className="rt-field">
          <span>{t('form.B')}</span>
          <NumberInput value={B} onChange={setB} />
        </label>
        <label className="rt-field">
          <span>{type === 3 ? t('form.LmRotule') : t('form.Lm')}</span>
          <NumberInput value={Lm} onChange={setLm} />
        </label>
        <label className="rt-field">
          <span>{t('form.beta')}</span>
          <NumberInput value={beta} onChange={setBeta} />
        </label>
        {type === 3 && (
          <label className="rt-field">
            <span>{t('form.j')}</span>
            <NumberInput value={j} onChange={setJ} />
          </label>
        )}
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      {!outcome.ok && (
        <p className="rt-error">
          {outcome.error.code === 'V1'
            ? t('errors.V1', { param: outcome.error.param })
            : t(`errors.${outcome.error.code}`)}
        </p>
      )}

      {outcome.ok && (
        <>
          <table>
            <caption>{t('result.title')}</caption>
            <thead>
              <tr>
                <th>{t('result.designation')}</th>
                <th>{t('result.value')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.labelKey}>
                  <td>{t(`result.${row.labelKey}`)}</td>
                  <td style={row.given ? { fontWeight: 700 } : undefined}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {residualNote && (
            <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>{residualNote}</p>
          )}

          {resultData && (
            <ExportButtons
              filenameBase={`arc2poly-t${type}-ra${Math.round(Ra)}`}
              resultData={resultData}
              projectName={activeProjectName}
            />
          )}
        </>
      )}

      <ProjectManager<Arc2PolyProjectData>
        key={projectListVersion}
        moduleId={MODULE_ID}
        activeProjectId={activeProjectId}
        createDefaultData={createDefaultData}
        onOpen={handleOpen}
      />

      <EnvironmentTransfer
        moduleId={MODULE_ID}
        onImported={() => setProjectListVersion((v) => v + 1)}
      />
    </ResultPageLayout>
  );
}
