'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EnvironmentTransfer,
  ExportButtons,
  NumberInput,
  ProjectManager,
  ResultPageLayout,
  updateProject,
  type DrawingScale,
  type Project,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  arcAndSegmentationFrom2a,
  arcAndSegmentationFrom2b,
  arcFromRadius,
  arcFromSagitta,
  arcFromTangent,
  buildKeyPointsTable,
  buildPolylineVertices,
  segmentationFromDeltaTarget,
  segmentationFromLength,
  type ArcCore,
  type CommonInputs,
  type RaccVertErrorCode,
  type Segmentation,
} from '../math/raccvert';
import type {
  Approche1Part1Mode,
  Approche1Part2Mode,
  Approche2SubMode,
  RaccVertApproach,
  RaccVertProjectData,
} from '../types';

const MODULE_ID = 'raccvert';

const DEFAULT_I0_PER_MILLE = 15;
const DEFAULT_IN_PER_MILLE = -15;
const DEFAULT_KV_MM = 0;
const DEFAULT_HV_MM = 100;
const DEFAULT_RADIUS_MM = -5000;
const DEFAULT_SAGITTA_MM = 5;
const DEFAULT_TANGENT_MM = 100;
const DEFAULT_DELTA_TARGET_PER_MILLE = 5;
const DEFAULT_APPROCHE1_LENGTH_MM = 50;
const DEFAULT_N_SEGMENTS = 5;
const DEFAULT_APPROCHE2_LENGTH_MM = 50;
const DEFAULT_DELTA_I2B_PER_MILLE = 5;
const DEFAULT_DECIMALS = 1;
const MAX_DECIMALS = 6;
const DEFAULT_VERTICAL_EXAGGERATION = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Arrondit puis évite l'artefact "-0.000" (zéro négatif issu d'une imprécision flottante). */
function formatFixed(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.startsWith('-') && Number(fixed) === 0 ? fixed.slice(1) : fixed;
}

function formatNumber(value: number, decimals: number): string {
  return formatFixed(value, decimals);
}

/** Pentes affichées en entier (‰), sans décimale — CDC §6.4. */
function formatGrade(value: number): string {
  return formatFixed(value, 0);
}

export function RaccVertModulePage() {
  const t = useTranslations('moduleRaccVert');
  const tCommon = useTranslations('common');

  const [i0PerMille, setI0PerMille] = useState(DEFAULT_I0_PER_MILLE);
  const [inPerMille, setInPerMille] = useState(DEFAULT_IN_PER_MILLE);
  const [kVMm, setKVMm] = useState(DEFAULT_KV_MM);
  const [hVMm, setHVMm] = useState(DEFAULT_HV_MM);

  const [activeApproach, setActiveApproach] = useState<RaccVertApproach>('approche1');

  const [approche1Part1Mode, setApproche1Part1Mode] = useState<Approche1Part1Mode>('radius');
  const [radiusMm, setRadiusMm] = useState(DEFAULT_RADIUS_MM);
  const [sagittaMm, setSagittaMm] = useState(DEFAULT_SAGITTA_MM);
  const [tangentMm, setTangentMm] = useState(DEFAULT_TANGENT_MM);
  const [approche1Part2Mode, setApproche1Part2Mode] = useState<Approche1Part2Mode>('deltaITarget');
  const [deltaITargetPerMille, setDeltaITargetPerMille] = useState(DEFAULT_DELTA_TARGET_PER_MILLE);
  const [approche1LengthMm, setApproche1LengthMm] = useState(DEFAULT_APPROCHE1_LENGTH_MM);

  const [approche2SubMode, setApproche2SubMode] = useState<Approche2SubMode>('2a');
  const [nSegments, setNSegments] = useState(DEFAULT_N_SEGMENTS);
  const [approche2LengthMm, setApproche2LengthMm] = useState(DEFAULT_APPROCHE2_LENGTH_MM);
  const [deltaI2bPerMille, setDeltaI2bPerMille] = useState(DEFAULT_DELTA_I2B_PER_MILLE);

  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);
  const [drawingScale, setDrawingScale] = useState<DrawingScale>({ mode: 'fit' });
  const [verticalExaggeration, setVerticalExaggeration] = useState<1 | 2 | 5 | 10>(
    DEFAULT_VERTICAL_EXAGGERATION,
  );
  const [horizonHMm, setHorizonHMm] = useState(0);
  const [horizonEdited, setHorizonEdited] = useState(false);

  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  // Remonte ProjectManager (via sa `key`) après un import en vrac ou un save, pour qu'il
  // relise sa liste de projets — sinon rouvrir le même projet reservirait l'ancien état.
  const [projectListVersion, setProjectListVersion] = useState(0);

  const common: CommonInputs = { i0PerMille, inPerMille, kVMm, hVMm };

  let core: ArcCore | undefined;
  let seg: Segmentation | undefined;
  let inputError: RaccVertErrorCode | undefined;

  if (activeApproach === 'approche1') {
    const part1Result =
      approche1Part1Mode === 'radius'
        ? arcFromRadius(common, radiusMm)
        : approche1Part1Mode === 'sagitta'
          ? arcFromSagitta(common, sagittaMm)
          : arcFromTangent(common, tangentMm);

    if (part1Result.ok) {
      core = part1Result.value;
      const part2Result =
        approche1Part2Mode === 'deltaITarget'
          ? segmentationFromDeltaTarget(core, deltaITargetPerMille)
          : segmentationFromLength(core, approche1LengthMm);
      if (part2Result.ok) seg = part2Result.value;
      else inputError = part2Result.error;
    } else {
      inputError = part1Result.error;
    }
  } else {
    const result =
      approche2SubMode === '2a'
        ? arcAndSegmentationFrom2a(common, nSegments, approche2LengthMm)
        : arcAndSegmentationFrom2b(common, approche2LengthMm, deltaI2bPerMille);
    if (result.ok) {
      core = result.value;
      seg = result.value;
    } else {
      inputError = result.error;
    }
  }

  let resultData: ResultData | undefined;
  let keyPoints: ReturnType<typeof buildKeyPointsTable> | undefined;
  let polylineVertices: ReturnType<typeof buildPolylineVertices> | undefined;

  if (core && seg) {
    keyPoints = buildKeyPointsTable(core, seg.deltaIEffPerMille);
    polylineVertices = buildPolylineVertices(core, seg);

    resultData = {
      title: t('title'),
      summaryTable: {
        headers: [
          t('result.summary.r'),
          t('result.summary.f'),
          t('result.summary.t'),
          t('result.summary.n'),
          t('result.summary.lEff'),
          t('result.summary.deltaIEff'),
          t('result.summary.rInt'),
        ],
        rows: [
          [
            formatNumber(core.rMm, decimals),
            formatNumber(core.fMm, decimals),
            formatNumber(core.tMm, decimals),
            seg.n,
            formatNumber(seg.lMm, decimals),
            formatGrade(seg.deltaIEffPerMille),
            formatNumber(seg.rIntMm, decimals),
          ],
        ],
      },
      tableIntro: {
        headers: [
          t('table.pointsCles.point'),
          t('table.pointsCles.k'),
          t('table.pointsCles.h'),
          t('table.pointsCles.gradeBefore'),
          t('table.pointsCles.gradeAfter'),
        ],
        rows: keyPoints.map((p) => [
          p.name,
          formatNumber(p.kMm, decimals),
          formatNumber(p.hMm, decimals),
          p.gradeBeforePerMille === undefined ? '—' : formatGrade(p.gradeBeforePerMille),
          p.gradeAfterPerMille === undefined ? '—' : formatGrade(p.gradeAfterPerMille),
        ]),
      },
      table: {
        headers: [
          t('table.sommets.index'),
          t('table.pointsCles.k'),
          t('table.pointsCles.h'),
          t('table.pointsCles.gradeBefore'),
          t('table.pointsCles.gradeAfter'),
        ],
        rows: polylineVertices.map((v) => [
          v.index,
          formatNumber(v.kMm, decimals),
          formatNumber(v.hMm, decimals),
          v.gradeBeforePerMille === undefined ? '—' : formatGrade(v.gradeBeforePerMille),
          v.gradeAfterPerMille === undefined ? '—' : formatGrade(v.gradeAfterPerMille),
        ]),
      },
    };
  }

  if (core && !horizonEdited) {
    const minHMm = Math.min(core.hTcMm, core.hCtMm, core.hPMm);
    const autoHorizonHMm = Math.floor(minHMm / 100) * 100;
    if (autoHorizonHMm !== horizonHMm) setHorizonHMm(autoHorizonHMm);
  }

  function handleDecimalsChange(next: number) {
    setDecimals(clamp(Math.round(next), 0, MAX_DECIMALS));
  }

  function handleHorizonChange(next: number) {
    setHorizonEdited(true);
    setHorizonHMm(next);
  }

  function createDefaultData(): RaccVertProjectData {
    return {
      i0PerMille,
      inPerMille,
      kVMm,
      hVMm,
      activeApproach,
      approche1Part1Mode,
      radiusMm,
      sagittaMm,
      tangentMm,
      approche1Part2Mode,
      deltaITargetPerMille,
      approche1LengthMm,
      approche2SubMode,
      nSegments,
      approche2LengthMm,
      deltaI2bPerMille,
      decimals,
      drawingScale,
      verticalExaggeration,
      horizonHMm,
    };
  }

  function handleOpen(project: Project<RaccVertProjectData>) {
    setI0PerMille(project.data.i0PerMille);
    setInPerMille(project.data.inPerMille);
    setKVMm(project.data.kVMm);
    setHVMm(project.data.hVMm);
    setActiveApproach(project.data.activeApproach);
    setApproche1Part1Mode(project.data.approche1Part1Mode);
    setRadiusMm(project.data.radiusMm);
    setSagittaMm(project.data.sagittaMm);
    setTangentMm(project.data.tangentMm);
    setApproche1Part2Mode(project.data.approche1Part2Mode);
    setDeltaITargetPerMille(project.data.deltaITargetPerMille);
    setApproche1LengthMm(project.data.approche1LengthMm);
    setApproche2SubMode(project.data.approche2SubMode);
    setNSegments(project.data.nSegments);
    setApproche2LengthMm(project.data.approche2LengthMm);
    setDeltaI2bPerMille(project.data.deltaI2bPerMille);
    setDecimals(project.data.decimals);
    setDrawingScale(project.data.drawingScale);
    setVerticalExaggeration(project.data.verticalExaggeration);
    setHorizonHMm(project.data.horizonHMm);
    setHorizonEdited(true);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<RaccVertProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    setProjectListVersion((v) => v + 1);
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field rt-field--inline">
          <span>{t('common.decimals')}</span>
          <NumberInput value={decimals} onChange={handleDecimalsChange} />
        </label>
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('common.i0')}</span>
          <NumberInput value={i0PerMille} onChange={setI0PerMille} />
        </label>
        <label className="rt-field">
          <span>{t('common.iN')}</span>
          <NumberInput value={inPerMille} onChange={setInPerMille} />
        </label>
        <label className="rt-field">
          <span>{t('common.kV')}</span>
          <NumberInput value={kVMm} onChange={setKVMm} />
        </label>
        <label className="rt-field">
          <span>{t('common.hV')}</span>
          <NumberInput value={hVMm} onChange={setHVMm} />
        </label>
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('approach.label')}</span>
          <select
            className="rt-select"
            value={activeApproach}
            onChange={(event) => setActiveApproach(event.target.value as RaccVertApproach)}
          >
            <option value="approche1">{t('approach.approche1')}</option>
            <option value="approche2">{t('approach.approche2')}</option>
          </select>
        </label>
      </div>

      {activeApproach === 'approche1' ? (
        <>
          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('approche1.part1.label')}</span>
              <select
                className="rt-select"
                value={approche1Part1Mode}
                onChange={(event) =>
                  setApproche1Part1Mode(event.target.value as Approche1Part1Mode)
                }
              >
                <option value="radius">{t('approche1.part1.radius')}</option>
                <option value="sagitta">{t('approche1.part1.sagitta')}</option>
                <option value="tangent">{t('approche1.part1.tangent')}</option>
              </select>
            </label>
            {approche1Part1Mode === 'radius' && (
              <label className="rt-field">
                <span>{t('approche1.part1.radius')}</span>
                <NumberInput value={radiusMm} onChange={setRadiusMm} />
              </label>
            )}
            {approche1Part1Mode === 'sagitta' && (
              <label className="rt-field">
                <span>{t('approche1.part1.sagitta')}</span>
                <NumberInput value={sagittaMm} onChange={setSagittaMm} />
              </label>
            )}
            {approche1Part1Mode === 'tangent' && (
              <label className="rt-field">
                <span>{t('approche1.part1.tangent')}</span>
                <NumberInput value={tangentMm} onChange={setTangentMm} />
              </label>
            )}
          </div>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('approche1.part2.label')}</span>
              <select
                className="rt-select"
                value={approche1Part2Mode}
                onChange={(event) =>
                  setApproche1Part2Mode(event.target.value as Approche1Part2Mode)
                }
              >
                <option value="deltaITarget">{t('approche1.part2.deltaITarget')}</option>
                <option value="length">{t('approche1.part2.length')}</option>
              </select>
            </label>
            {approche1Part2Mode === 'deltaITarget' && (
              <label className="rt-field">
                <span>{t('approche1.part2.deltaITarget')}</span>
                <NumberInput value={deltaITargetPerMille} onChange={setDeltaITargetPerMille} />
              </label>
            )}
            {approche1Part2Mode === 'length' && (
              <label className="rt-field">
                <span>{t('approche1.part2.length')}</span>
                <NumberInput value={approche1LengthMm} onChange={setApproche1LengthMm} />
              </label>
            )}
          </div>
        </>
      ) : (
        <div className="rt-toolbar">
          <label className="rt-field">
            <span>{t('approche2.subMode.label')}</span>
            <select
              className="rt-select"
              value={approche2SubMode}
              onChange={(event) => setApproche2SubMode(event.target.value as Approche2SubMode)}
            >
              <option value="2a">{t('approche2.subMode.2a')}</option>
              <option value="2b">{t('approche2.subMode.2b')}</option>
            </select>
          </label>
          {approche2SubMode === '2a' && (
            <>
              <label className="rt-field">
                <span>{t('approche2.n')}</span>
                <NumberInput value={nSegments} onChange={(v) => setNSegments(Math.round(v))} />
              </label>
              <label className="rt-field">
                <span>{t('approche2.length')}</span>
                <NumberInput value={approche2LengthMm} onChange={setApproche2LengthMm} />
              </label>
            </>
          )}
          {approche2SubMode === '2b' && (
            <>
              <label className="rt-field">
                <span>{t('approche2.length')}</span>
                <NumberInput value={approche2LengthMm} onChange={setApproche2LengthMm} />
              </label>
              <label className="rt-field">
                <span>{t('approche2.deltaI2b')}</span>
                <NumberInput value={deltaI2bPerMille} onChange={setDeltaI2bPerMille} />
              </label>
            </>
          )}
        </div>
      )}

      {inputError && <p className="rt-error">{t(`errors.${inputError}`)}</p>}

      {core && seg && (
        <p
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 600,
            color: 'var(--rt-color-primary)',
          }}
        >
          R = {formatNumber(core.rMm, decimals)} mm — f = {formatNumber(core.fMm, decimals)} mm —
          T = {formatNumber(core.tMm, decimals)} mm — n = {seg.n}
        </p>
      )}

      {resultData && (
        <ExportButtons
          filenameBase={`raccvert-r${Math.round(core?.rMm ?? 0)}`}
          resultData={resultData}
          projectName={activeProjectName}
        />
      )}

      {keyPoints && (
        <table>
          <caption>{t('table.pointsCles.title')}</caption>
          <thead>
            <tr>
              <th>{t('table.pointsCles.point')}</th>
              <th>{t('table.pointsCles.k')}</th>
              <th>{t('table.pointsCles.h')}</th>
              <th>{t('table.pointsCles.gradeBefore')}</th>
              <th>{t('table.pointsCles.gradeAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {keyPoints.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{formatNumber(p.kMm, decimals)}</td>
                <td>{formatNumber(p.hMm, decimals)}</td>
                <td>{p.gradeBeforePerMille === undefined ? '—' : formatGrade(p.gradeBeforePerMille)}</td>
                <td>{p.gradeAfterPerMille === undefined ? '—' : formatGrade(p.gradeAfterPerMille)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {polylineVertices && (
        <table>
          <caption>{t('table.sommets.title')}</caption>
          <thead>
            <tr>
              <th>{t('table.sommets.index')}</th>
              <th>{t('table.pointsCles.k')}</th>
              <th>{t('table.pointsCles.h')}</th>
              <th>{t('table.pointsCles.gradeBefore')}</th>
              <th>{t('table.pointsCles.gradeAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {polylineVertices.map((v) => (
              <tr key={v.index}>
                <td>{v.index}</td>
                <td>{formatNumber(v.kMm, decimals)}</td>
                <td>{formatNumber(v.hMm, decimals)}</td>
                <td>{v.gradeBeforePerMille === undefined ? '—' : formatGrade(v.gradeBeforePerMille)}</td>
                <td>{v.gradeAfterPerMille === undefined ? '—' : formatGrade(v.gradeAfterPerMille)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {core && (
        <div className="rt-toolbar">
          <label className="rt-field rt-field--inline">
            <span>{t('common.horizonH')}</span>
            <NumberInput value={horizonHMm} onChange={handleHorizonChange} />
          </label>
        </div>
      )}

      <ProjectManager<RaccVertProjectData>
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
