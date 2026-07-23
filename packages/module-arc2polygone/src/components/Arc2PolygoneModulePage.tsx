'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  AngleCote,
  DEFAULT_COTE_OFFSET_MM,
  DEFAULT_DRAWING_SCALE,
  DrawingLightbox,
  DrawingScaleSelector,
  EnvironmentTransfer,
  ExportButtons,
  LengthCote,
  NumberInput,
  PointLabel,
  ProjectManager,
  ResultPageLayout,
  ScaleBar,
  getPreferredDrawingScale,
  lineStyleToSvgProps,
  suggestDimensionSizing,
  updateProject,
  type DrawingScale,
  type Point,
  type Project,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import { computeArc2Poly, type SupportType } from '../calc/arc2poly';
import { buildArc2PolyDrawing, RADIUS_COLORS, type Arc2PolyDrawing } from '../drawing/geometry';
import type { Arc2PolyProjectData } from '../types';

const MODULE_ID = 'arc2polygone';

const DEFAULT_RA_MM = 2000;
const DEFAULT_B_MM = 200;
const DEFAULT_LM_MM = 400;
const DEFAULT_BETA_DEG = 90;
const DEFAULT_J_MM = 0;

/** Rayon (mm de dessin) des petits arcs de cotation d'angle (rentrant, coupe). */
const SMALL_ANGLE_RADIUS_MM = 12;

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

/** Angle normalisé dans [0 ; 2π[. */
function norm(a: number): number {
  const x = a % (2 * Math.PI);
  return x < 0 ? x + 2 * Math.PI : x;
}

/**
 * Ordonne deux directions autour d'un sommet pour qu'`AngleCote` (qui balaie start → end
 * en sens croissant) trace le petit secteur (< π), pas son complément.
 */
function shortAngle(vertex: Point, pa: Point, pb: Point): { start: number; end: number } {
  const a = Math.atan2(pa.y - vertex.y, pa.x - vertex.x);
  const b = Math.atan2(pb.y - vertex.y, pb.x - vertex.x);
  return norm(b - a) <= Math.PI ? { start: a, end: b } : { start: b, end: a };
}

/** Une ligne du tableau de résultats (grandeur → valeur). `given` = valeur saisie (gras). */
interface ResultRow {
  labelKey: string;
  value: string;
  given: boolean;
}

const DASH_THIN = { kind: 'dashedShort', color: '#8a8a8a', widthMm: 0.2 } as const;

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
  const [drawingScale, setDrawingScale] = useState<DrawingScale>(DEFAULT_DRAWING_SCALE);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  const [projectListVersion, setProjectListVersion] = useState(0);
  // Le dessin est rendu uniquement après montage : ses coordonnées dérivent de sin/cos
  // pleine précision, qui peuvent différer d'un ULP entre le moteur JS du serveur (SSR) et
  // celui du navigateur, ce qui provoquerait un mismatch d'hydratation sur les points SVG.
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!activeProjectId) void getPreferredDrawingScale().then(setDrawingScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outcome = computeArc2Poly({ type, Ra, B, Lm, beta, j: type === 3 ? j : undefined });

  // Tableau à colonnes masquées selon le type (CDC §8.2).
  let rows: ResultRow[] = [];
  let drawing: Arc2PolyDrawing | undefined;
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
    drawing = buildArc2PolyDrawing(type, r, Ra, B, drawingScale, showOverhangCotes);
  }

  const overhangValue: Record<'EiMin' | 'EiMax' | 'EeMin' | 'EeMax', number> = outcome.ok
    ? {
        EiMin: outcome.result.EiMin,
        EiMax: outcome.result.EiMax,
        EeMin: outcome.result.EeMin,
        EeMax: outcome.result.EeMax,
      }
    : { EiMin: 0, EiMax: 0, EeMin: 0, EeMax: 0 };

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
        drawingAlt: t('title'),
        table: {
          headers: [t('result.designation'), t('result.value')],
          rows: rows.map((row) => [t(`result.${row.labelKey}`), row.value]),
          boldCells: rows.map((row) => [false, row.given]),
        },
        notes: residualNote ? [residualNote] : undefined,
      }
    : undefined;

  function createDefaultData(): Arc2PolyProjectData {
    return { type, Ra, B, Lm, beta, j, drawingScale, showOverhangCotes };
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
    setDrawingScale(d.drawingScale);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<Arc2PolyProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    setProjectListVersion((v) => v + 1);
  }

  function renderDrawing(g: Arc2PolyDrawing, ref?: Ref<SVGSVGElement>): ReactNode {
    const sizing = suggestDimensionSizing();
    const rentrantArc = g.rentrant ? shortAngle(g.rentrant.vertex, g.rentrant.a, g.rentrant.b) : undefined;
    const cutArc = g.cut ? shortAngle(g.cut.vertex, g.cut.square, g.cut.radial) : undefined;
    return (
      <svg
        ref={ref}
        viewBox={`${g.viewBox.minX} ${g.viewBox.minY} ${g.viewBox.width} ${g.viewBox.height}`}
        width="100%"
        style={{ maxWidth: 620, height: 'auto', background: 'transparent' }}
      >
        {/* Rayons-vecteurs O → joints (trait fin). */}
        {g.jointRays.map((ray, i) => (
          <line
            key={`ray${i}`}
            x1={ray.from.x}
            y1={ray.from.y}
            x2={ray.to.x}
            y2={ray.to.y}
            {...lineStyleToSvgProps({ kind: 'solid', color: '#9aa4ad', widthMm: 0.2 })}
          />
        ))}

        {/* Les 4 rayons caractéristiques en trait d'axe, aux couleurs imposées. */}
        {g.radiusArcs.map((arc) => (
          <g key={arc.name}>
            <polyline
              points={arc.points}
              fill="none"
              {...lineStyleToSvgProps({ kind: 'centerline', color: arc.color, widthMm: 0.25 })}
            />
            <text
              x={arc.labelPoint.x + 2}
              y={arc.labelPoint.y}
              fontSize={sizing.textSizeMm}
              fill={arc.color}
              fontFamily="Arial, Helvetica, sans-serif"
              dominantBaseline="middle"
            >
              {arc.name}
            </text>
          </g>
        ))}

        {/* Contours réels des 3 éléments. */}
        {g.elementPaths.map((d, i) => (
          <path key={`el${i}`} d={d} fill="#dbe7f3" fillOpacity={0.85} stroke="#33536e" strokeWidth={0.4} />
        ))}

        {/* Type 3 : pivots + cercle de rotule illustratif. */}
        {g.pivots.map((p, i) => (
          <circle key={`piv${i}`} cx={p.x} cy={p.y} r={0.8} fill={RADIUS_COLORS.Rm} />
        ))}
        {g.rotule && (
          <>
            <circle
              cx={g.rotule.center.x}
              cy={g.rotule.center.y}
              r={g.rotule.radiusMm}
              fill="none"
              {...lineStyleToSvgProps({ kind: 'solid', color: RADIUS_COLORS.Rm, widthMm: 0.3 })}
            />
            <PointLabel point={g.rotule.center} label={t('drawing.rotule')} directionRad={Math.PI / 4} sizing={sizing} />
          </>
        )}

        {/* Cotation de l'angle α au centre. */}
        <AngleCote
          center={g.alphaArc.center}
          startAngleRad={g.alphaArc.startAngleRad}
          endAngleRad={g.alphaArc.endAngleRad}
          radiusMm={g.alphaArc.radiusMm}
          label={outcome.ok ? `α = ${formatAng(outcome.result.alphaDeg)}°` : ''}
          sizing={sizing}
        />

        {/* Angle rentrant (types 2 et 3). */}
        {g.rentrant && rentrantArc && (
          <>
            <line
              x1={g.rentrant.vertex.x}
              y1={g.rentrant.vertex.y}
              x2={g.rentrant.a.x}
              y2={g.rentrant.a.y}
              {...lineStyleToSvgProps(DASH_THIN)}
            />
            <line
              x1={g.rentrant.vertex.x}
              y1={g.rentrant.vertex.y}
              x2={g.rentrant.b.x}
              y2={g.rentrant.b.y}
              {...lineStyleToSvgProps(DASH_THIN)}
            />
            <AngleCote
              center={g.rentrant.vertex}
              startAngleRad={rentrantArc.start}
              endAngleRad={rentrantArc.end}
              radiusMm={SMALL_ANGLE_RADIUS_MM}
              label={outcome.ok ? `${formatAng(outcome.result.rentrantDeg ?? 0)}°` : ''}
              sizing={sizing}
            />
          </>
        )}

        {/* Ouverture O (type 2). */}
        {g.opening && (
          <LengthCote
            from={g.opening.from}
            to={g.opening.to}
            offsetMm={DEFAULT_COTE_OFFSET_MM}
            label={`O ${formatLen(outcome.ok ? (outcome.result.O ?? 0) : 0)}`}
            sizing={sizing}
          />
        )}

        {/* Angle de coupe / onglet (type 1) : référence coupe droite + coupe radiale. */}
        {g.cut && cutArc && (
          <>
            <line
              x1={g.cut.vertex.x}
              y1={g.cut.vertex.y}
              x2={g.cut.square.x}
              y2={g.cut.square.y}
              {...lineStyleToSvgProps(DASH_THIN)}
            />
            <AngleCote
              center={g.cut.vertex}
              startAngleRad={cutArc.start}
              endAngleRad={cutArc.end}
              radiusMm={SMALL_ANGLE_RADIUS_MM}
              label={outcome.ok ? `${formatAng(outcome.result.coupeDeg ?? 0)}°` : ''}
              sizing={sizing}
            />
          </>
        )}

        {/* Cotes de débord (best-effort). */}
        {g.overhangs.map((o, i) => (
          <LengthCote
            key={`ovh${i}`}
            from={o.from}
            to={o.to}
            offsetMm={i % 2 === 0 ? DEFAULT_COTE_OFFSET_MM : -DEFAULT_COTE_OFFSET_MM}
            label={`${t(`drawing.${o.key}`)} ${formatLen(overhangValue[o.key])}`}
            sizing={sizing}
          />
        ))}

        <ScaleBar
          resolved={g.resolvedScale}
          x={0}
          y={g.drawingHeight + 14}
          unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
        />
      </svg>
    );
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

          {residualNote && <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>{residualNote}</p>}

          {drawing && mounted && (
            <>
              <div className="rt-check-group">
                <DrawingScaleSelector
                  value={drawingScale}
                  onChange={setDrawingScale}
                  className="rt-field rt-field--inline"
                />
                <label className="rt-field rt-field--check">
                  <span>{t('form.showOverhangCotes')}</span>
                  <input
                    type="checkbox"
                    checked={showOverhangCotes}
                    onChange={(event) => setShowOverhangCotes(event.target.checked)}
                  />
                </label>
                <DrawingLightbox
                  label={tCommon('drawing.enlarge')}
                  closeLabel={tCommon('actions.close')}
                  zoomInLabel={tCommon('drawing.zoomIn')}
                  zoomOutLabel={tCommon('drawing.zoomOut')}
                  resetLabel={tCommon('drawing.resetZoom')}
                >
                  {renderDrawing(drawing)}
                </DrawingLightbox>
              </div>

              {renderDrawing(drawing, svgRef)}
            </>
          )}

          {resultData && (
            <ExportButtons
              filenameBase={`arc2poly-t${type}-ra${Math.round(Ra)}`}
              resultData={resultData}
              getSvgElement={() => svgRef.current}
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

      <EnvironmentTransfer moduleId={MODULE_ID} onImported={() => setProjectListVersion((v) => v + 1)} />
    </ResultPageLayout>
  );
}
