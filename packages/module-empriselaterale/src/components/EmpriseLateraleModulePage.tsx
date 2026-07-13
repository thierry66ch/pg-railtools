'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EnvironmentTransfer,
  ExportButtons,
  NumberInput,
  ProjectManager,
  ResultPageLayout,
  itemLibrary,
  updateProject,
  type DrawingScale,
  type Project,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  segmentFromLibraryItem,
  vehicleSpecFromLibraryItem,
  type CalcStepMm,
  type EmpriseLateraleProjectData,
  type TrackElementLibraryItem,
  type TrackSegment,
  type VehicleLibraryItem,
  type VehicleSpec,
} from '../types';
import { angleFromChanfreinHypotenuse, chanfreinHypotenuseFromLtaper, computeChanfrein } from '../math/vehicle';
import { maxSRear, validateTrack } from '../math/track';
import { VehicleLibraryPanel } from './VehicleLibraryPanel';
import { TrackElementLibraryPanel } from './TrackElementLibraryPanel';
import { TrackSegmentEditor } from './TrackSegmentEditor';
import { DrawingView } from './DrawingView';
import { AnimationControls } from './AnimationControls';

const MODULE_ID = 'empriselaterale';
// Les tracés de ce module font typiquement plusieurs centaines de mm : "fit" par défaut
// (plutôt que le 1:1 par défaut de la préférence globale) évite un dessin d'export
// PDF/PNG débordant largement de la page dès la première utilisation.
const DEFAULT_DRAWING_SCALE: DrawingScale = { mode: 'fit' };

const CALC_STEP_OPTIONS: CalcStepMm[] = [5, 10, 20, 50];
const MAX_SEGMENTS = 10;

const vehicleLibrary = itemLibrary<VehicleLibraryItem>(MODULE_ID, 'vehicle');
const trackElementLibrary = itemLibrary<TrackElementLibraryItem>(MODULE_ID, 'trackElement');

function defaultVehicle(): VehicleSpec {
  return {
    name: '',
    longueurCaisseMm: 280,
    largeurCaisseMaxMm: 34,
    largeurCaisseExtremiteMm: 34,
    angleBiaisExtremiteDeg: 90,
    empattementMm: 180,
  };
}

export function EmpriseLateraleModulePage() {
  const t = useTranslations('moduleEmpriseLaterale');
  const tCommon = useTranslations('common');

  const [vehicle, setVehicle] = useState<VehicleSpec>(defaultVehicle());
  const [track, setTrack] = useState<TrackSegment[]>([{ type: 'line', lengthMm: 400 }]);
  const [calcStepMm, setCalcStepMm] = useState<CalcStepMm>(10);
  const [marginMm, setMarginMm] = useState<number>(50);
  const [drawingScale, setDrawingScale] = useState<DrawingScale>(DEFAULT_DRAWING_SCALE);
  const [sRearMm, setSRearMm] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  // Force le remount de ProjectManager (via sa `key`) après un import en vrac ou un
  // enregistrement direct — sans ça sa liste interne reste périmée (pieges-a-eviter.md).
  const [projectListVersion, setProjectListVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Listes de bibliothèque tenues au niveau de la page (pas seulement dans les panneaux
  // dédiés) pour alimenter les sélecteurs "puiser dans la bibliothèque" directement dans
  // le formulaire véhicule et dans chaque cadre de segment — évite d'avoir à défiler
  // jusqu'aux panneaux de bibliothèque en bas de page à chaque insertion.
  const [vehicleLibraryItems, setVehicleLibraryItems] = useState<VehicleLibraryItem[]>([]);
  const [trackElementLibraryItems, setTrackElementLibraryItems] = useState<TrackElementLibraryItem[]>([]);
  const [libraryVersion, setLibraryVersion] = useState(0);

  useEffect(() => {
    void vehicleLibrary.listItems().then(setVehicleLibraryItems);
    void trackElementLibrary.listItems().then(setTrackElementLibraryItems);
  }, [libraryVersion]);

  const vehicleResult = useMemo(() => computeChanfrein(vehicle), [vehicle]);
  const trackResult = useMemo(() => validateTrack(track, vehicle.empattementMm), [track, vehicle.empattementMm]);
  const chanfreinHypotenuseMm = vehicleResult.ok
    ? Math.round(chanfreinHypotenuseFromLtaper(vehicle, vehicleResult.value.ltaperMm) * 10) / 10
    : 0;

  function handleChanfreinHypotenuseChange(nextHypotenuseMm: number) {
    const angleDeg = angleFromChanfreinHypotenuse(vehicle, nextHypotenuseMm);
    if (angleDeg === undefined) return;
    setVehicle({ ...vehicle, angleBiaisExtremiteDeg: Math.round(angleDeg * 10) / 10 });
  }

  function createDefaultData(): EmpriseLateraleProjectData {
    return { vehicle, track, calcStepMm, marginMm, drawingScale };
  }

  function handleOpen(project: Project<EmpriseLateraleProjectData>) {
    setVehicle(project.data.vehicle);
    setTrack(project.data.track);
    setCalcStepMm(project.data.calcStepMm);
    setMarginMm(project.data.marginMm);
    setDrawingScale(project.data.drawingScale);
    setSRearMm(0);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<EmpriseLateraleProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    setProjectListVersion((v) => v + 1);
  }

  function handleUseVehicle(item: VehicleLibraryItem) {
    setVehicle(vehicleSpecFromLibraryItem(item));
  }

  function handleUseTrackElement(item: TrackElementLibraryItem) {
    setTrack((prev) => (prev.length >= MAX_SEGMENTS ? prev : [...prev, segmentFromLibraryItem(item)]));
  }

  function updateSegment(index: number, next: TrackSegment) {
    setTrack((prev) => prev.map((seg, i) => (i === index ? next : seg)));
  }

  function removeSegment(index: number) {
    setTrack((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function moveSegment(index: number, delta: -1 | 1) {
    setTrack((prev) => {
      const target = index + delta;
      const current = prev[index];
      const swapped = prev[target];
      if (target < 0 || target >= prev.length || !current || !swapped) return prev;
      const next = [...prev];
      next[index] = swapped;
      next[target] = current;
      return next;
    });
  }

  function addSegment() {
    setTrack((prev) => (prev.length >= MAX_SEGMENTS ? prev : [...prev, { type: 'line', lengthMm: 400 }]));
  }

  function describeSegment(segment: TrackSegment): string {
    return segment.type === 'line'
      ? t('library.trackElements.summaryLine', { length: segment.lengthMm ?? 0 })
      : t('library.trackElements.summaryCurve', { radius: segment.radiusMm ?? 0, angle: segment.angleDeg ?? 0 });
  }

  const resultData: ResultData | undefined =
    vehicleResult.ok && trackResult.ok
      ? {
          title: t('title'),
          description: vehicle.name || undefined,
          drawingAlt: t('title'),
          // Specs du véhicule uniquement (le chanfrein est une grandeur dérivée du
          // véhicule, pas du tracé) — séparé du résumé tracé/affichage ci-dessous pour
          // ne pas mélanger deux catégories d'information dans une même table.
          summaryTable: {
            headers: [
              t('vehicle.fields.name'),
              t('vehicle.fields.length'),
              t('vehicle.fields.widthMax'),
              t('vehicle.fields.widthEnd'),
              t('vehicle.fields.wheelbase'),
              t('vehicle.fields.angle'),
              t('summary.chanfreinLength'),
            ],
            rows: [
              [
                vehicle.name || '—',
                vehicle.longueurCaisseMm,
                vehicle.largeurCaisseMaxMm,
                vehicle.largeurCaisseExtremiteMm,
                vehicle.empattementMm,
                vehicle.angleBiaisExtremiteDeg,
                chanfreinHypotenuseMm.toFixed(1),
              ],
            ],
          },
          pageBreakBeforeTable: true,
          tableIntro: {
            headers: [t('summary.trackLength'), t('summary.segmentCount'), t('display.calcStep'), t('display.margin')],
            rows: [[trackResult.value.totalLengthMm.toFixed(1), track.length, calcStepMm, marginMm]],
          },
          table: {
            headers: [t('table.segmentIndex'), t('table.segmentDescription')],
            rows: track.map((segment, index) => [index + 1, describeSegment(segment)]),
          },
        }
      : undefined;

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-section">
        <h3 className="rt-section-title">{t('vehicle.title')}</h3>
        {vehicleLibraryItems.length > 0 && (
          <label className="rt-field rt-field--inline">
            <span>{t('vehicle.fromLibrary')}</span>
            <select
              className="rt-select"
              value=""
              onChange={(event) => {
                const item = vehicleLibraryItems.find((candidate) => candidate.id === event.target.value);
                if (item) setVehicle(vehicleSpecFromLibraryItem(item));
              }}
            >
              <option value="">{t('vehicle.fromLibraryPlaceholder')}</option>
              {vehicleLibraryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="rt-toolbar">
          <label className="rt-field">
            <span>{t('vehicle.fields.name')}</span>
            <input
              className="rt-input"
              value={vehicle.name}
              onChange={(event) => setVehicle({ ...vehicle, name: event.target.value })}
            />
          </label>
          <label className="rt-field">
            <span>{t('vehicle.fields.length')}</span>
            <NumberInput
              value={vehicle.longueurCaisseMm}
              onChange={(v) => setVehicle({ ...vehicle, longueurCaisseMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('vehicle.fields.widthMax')}</span>
            <NumberInput
              value={vehicle.largeurCaisseMaxMm}
              onChange={(v) => setVehicle({ ...vehicle, largeurCaisseMaxMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('vehicle.fields.widthEnd')}</span>
            <NumberInput
              value={vehicle.largeurCaisseExtremiteMm}
              onChange={(v) => setVehicle({ ...vehicle, largeurCaisseExtremiteMm: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('vehicle.fields.wheelbase')}</span>
            <NumberInput value={vehicle.empattementMm} onChange={(v) => setVehicle({ ...vehicle, empattementMm: v })} />
          </label>
          <label className="rt-field">
            <span>{t('vehicle.fields.angle')}</span>
            <NumberInput
              value={vehicle.angleBiaisExtremiteDeg}
              onChange={(v) => setVehicle({ ...vehicle, angleBiaisExtremiteDeg: v })}
            />
          </label>
          <label className="rt-field">
            <span>{t('summary.chanfreinLength')}</span>
            <NumberInput value={chanfreinHypotenuseMm} onChange={handleChanfreinHypotenuseChange} />
          </label>
          {activeProjectId && (
            <button type="button" className="rt-button" onClick={() => void handleSave()}>
              {tCommon('actions.save')}
            </button>
          )}
        </div>
        {!vehicleResult.ok && <p className="rt-error">{t(`errors.${vehicleResult.error}`)}</p>}
      </div>

      <div className="rt-section">
        <div className="rt-toolbar" style={{ justifyContent: 'space-between' }}>
          <h3 className="rt-section-title">{t('track.title')}</h3>
          <button type="button" className="rt-button rt-button--secondary" disabled={track.length >= MAX_SEGMENTS} onClick={addSegment}>
            {t('track.addSegment')}
          </button>
        </div>
        {track.map((segment, index) => (
          <TrackSegmentEditor
            key={index}
            segment={segment}
            index={index}
            isFirst={index === 0}
            isLast={index === track.length - 1}
            canRemove={track.length > 1}
            libraryItems={trackElementLibraryItems}
            onChange={(next) => updateSegment(index, next)}
            onRemove={() => removeSegment(index)}
            onMoveUp={() => moveSegment(index, -1)}
            onMoveDown={() => moveSegment(index, 1)}
          />
        ))}
        {!trackResult.ok && <p className="rt-error">{t(`errors.${trackResult.error}`)}</p>}
      </div>

      <div className="rt-section">
        <h3 className="rt-section-title">{t('display.title')}</h3>
        <div className="rt-toolbar">
          <label className="rt-field">
            <span>{t('display.calcStep')}</span>
            <select
              className="rt-select"
              value={calcStepMm}
              onChange={(event) => setCalcStepMm(Number(event.target.value) as CalcStepMm)}
            >
              {CALC_STEP_OPTIONS.map((step) => (
                <option key={step} value={step}>
                  {step} mm
                </option>
              ))}
            </select>
          </label>
          <label className="rt-field">
            <span>{t('display.margin')}</span>
            <NumberInput value={marginMm} onChange={setMarginMm} />
          </label>
        </div>
      </div>

      <div className="rt-section">
        <h3 className="rt-section-title">{t('summary.title')}</h3>
        <table>
          <tbody>
            <tr>
              <td>{t('summary.trackLength')}</td>
              <td>{trackResult.ok ? `${trackResult.value.totalLengthMm.toFixed(1)} mm` : '—'}</td>
            </tr>
            <tr>
              <td>{t('summary.segmentCount')}</td>
              <td>{track.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {vehicleResult.ok && trackResult.ok && (
        <>
          <AnimationControls
            sRearMm={Math.min(sRearMm, maxSRear(trackResult.value.totalLengthMm, vehicle.empattementMm))}
            sRearMaxMm={maxSRear(trackResult.value.totalLengthMm, vehicle.empattementMm)}
            calcStepMm={calcStepMm}
            onChange={setSRearMm}
          />
          <DrawingView
            vehicle={vehicle}
            ltaperMm={vehicleResult.value.ltaperMm}
            track={track}
            calcStepMm={calcStepMm}
            sRearMm={sRearMm}
            marginMm={marginMm}
            drawingScale={drawingScale}
            onDrawingScaleChange={setDrawingScale}
            svgRef={svgRef}
          />

          {resultData && (
            <ExportButtons
              filenameBase={`empriselaterale-${vehicle.name || 'vehicule'}`}
              resultData={resultData}
              getSvgElement={() => svgRef.current}
              projectName={activeProjectName}
            />
          )}
        </>
      )}

      <VehicleLibraryPanel onUseInProject={handleUseVehicle} onChanged={() => setLibraryVersion((v) => v + 1)} />
      <TrackElementLibraryPanel
        onUseInProject={handleUseTrackElement}
        onChanged={() => setLibraryVersion((v) => v + 1)}
      />

      <ProjectManager<EmpriseLateraleProjectData>
        key={projectListVersion}
        moduleId={MODULE_ID}
        activeProjectId={activeProjectId}
        createDefaultData={createDefaultData}
        onOpen={handleOpen}
      />

      <EnvironmentTransfer moduleId={MODULE_ID} onImported={() => setProjectListVersion((v) => v + 1)} />
    </ResultPageLayout>
  );
}
