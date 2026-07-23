/**
 * Suite de tests du moteur Arc2Poly — cas numériques T1–T5, invariants, cas d'erreur.
 * Réf. PROMPT_ClaudeCode_Arc2Poly.md §4.
 *
 * Écrit avec le runner intégré de Node (`node:test` + `node:assert`), sans dépendance
 * externe. Exécution : compiler le dossier `calc` avec `tsc` puis `node --test`
 * (le repo n'embarque pas encore de runner TS ; voir scripts/verify si présent).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeArc2Poly, type Arc2PolyResult } from './arc2poly';

const LEN_TOL = 1e-3; // mm
const ANG_TOL = 1e-4; // degrés

function ok(input: Parameters<typeof computeArc2Poly>[0]): Arc2PolyResult {
  const outcome = computeArc2Poly(input);
  assert.equal(outcome.ok, true, `attendu ok=true pour ${JSON.stringify(input)}`);
  if (!outcome.ok) throw new Error('unreachable');
  return outcome.result;
}

function closeLen(actual: number, expected: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) < LEN_TOL,
    `${label}: ${actual} ≈ ${expected} (écart ${Math.abs(actual - expected)})`,
  );
}
function closeAng(actual: number, expected: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) < ANG_TOL,
    `${label}: ${actual} ≈ ${expected} (écart ${Math.abs(actual - expected)})`,
  );
}

// --- Cas T1 — Type 1 ---
test('T1 — type 1, Ra=2000 B=200 Lm=400 β=90', () => {
  const r = ok({ type: 1, Ra: 2000, B: 200, Lm: 400, beta: 90 });
  closeAng(r.alphaDeg, 11.4482, 'α');
  closeLen(r.Rm, 2005.25, 'Rm');
  closeLen(r.Ri, 1904.749, 'Ri');
  closeLen(r.Re, 2105.751, 'Re');
  closeLen(r.Li!, 379.952, 'Li');
  closeLen(r.Le!, 420.048, 'Le');
  closeAng(r.coupeDeg!, 5.7241, 'coupe');
  closeLen(r.EiMin, 95.251, 'Ei min');
  closeLen(r.EiMax, 104.749, 'Ei max');
  closeLen(r.EeMin, 95.251, 'Ee min');
  closeLen(r.EeMax, 105.751, 'Ee max');
  assert.equal(r.n, 7, 'n');
  closeAng(r.betaResidualDeg, 9.8627, 'βr');
  closeLen(r.residualChord, 344.75, 'cr');
});

// --- Cas T2 — Type 2 ---
test('T2 — type 2, Ra=2000 B=200 Lm=400 β=90', () => {
  const r = ok({ type: 2, Ra: 2000, B: 200, Lm: 400, beta: 90 });
  closeAng(r.alphaDeg, 12.0512, 'α');
  closeLen(r.Rm, 2004.738, 'Rm');
  closeLen(r.Ri, 1905.263, 'Ri');
  closeLen(r.Re, 2104.263, 'Re');
  closeLen(r.O!, 41.989, 'O');
  closeAng(r.rentrantDeg!, 167.9488, 'rentrant');
  closeLen(r.EiMin, 94.737, 'Ei min');
  closeLen(r.EiMax, 105.263, 'Ei max');
  closeLen(r.EeMin, 94.737, 'Ee min');
  closeLen(r.EeMax, 104.263, 'Ee max');
  assert.equal(r.n, 7, 'n');
  closeAng(r.betaResidualDeg, 5.6419, 'βr');
  closeLen(r.residualChord, 197.328, 'cr');
  assert.ok(r.RmGreaterThanRa, 'Rm > Ra attendu pour le type 2');
});

// --- Cas T3 — Type 3, j=0 ---
test('T3 — type 3, Ra=2000 B=200 Lm=400 j=0 β=90', () => {
  const r = ok({ type: 3, Ra: 2000, B: 200, Lm: 400, j: 0, beta: 90 });
  closeAng(r.alphaDeg, 11.4511, 'α');
  closeLen(r.Rm, 2004.738, 'Rm');
  closeLen(r.Ri, 1905.263, 'Ri');
  closeLen(r.Re, 2104.738, 'Re');
  closeAng(r.rentrantDeg!, 168.5489, 'rentrant');
  closeLen(r.EiMin, 94.737, 'Ei min');
  closeLen(r.EiMax, 105.263, 'Ei max');
  closeLen(r.EeMin, 94.737, 'Ee min');
  closeLen(r.EeMax, 104.738, 'Ee max');
  assert.equal(r.n, 7, 'n');
  closeAng(r.betaResidualDeg, 9.8422, 'βr');
  closeLen(r.residualChord, 343.947, 'cr');
});

// --- Cas T4 — Type 3 avec jeu ---
test('T4 — type 3, Ra=2000 B=200 Lm=400 j=5 β=90', () => {
  const r = ok({ type: 3, Ra: 2000, B: 200, Lm: 400, j: 5, beta: 90 });
  closeAng(r.alphaDeg, 11.5941, 'α');
  closeLen(r.Rm, 2004.857, 'Rm');
  closeLen(r.Ri, 1905.396, 'Ri');
  closeLen(r.Re, 2104.857, 'Re');
  closeAng(r.rentrantDeg!, 168.4059, 'rentrant');
  closeLen(r.EiMin, 94.604, 'Ei min');
  closeLen(r.EiMax, 105.396, 'Ei max');
  closeLen(r.EeMin, 94.604, 'Ee min');
  closeLen(r.EeMax, 104.857, 'Ee max');
  assert.equal(r.n, 7, 'n');
  closeAng(r.betaResidualDeg, 8.8416, 'βr');
  closeLen(r.residualChord, 309.073, 'cr');
});

// --- Cas T5 — Type 1, courbure serrée ---
test('T5 — type 1, Ra=1000 B=150 Lm=500 β=60', () => {
  const r = ok({ type: 1, Ra: 1000, B: 150, Lm: 500, beta: 60 });
  closeAng(r.alphaDeg, 28.4666, 'α');
  closeLen(r.Rm, 1016.794, 'Rm');
  closeLen(r.Ri, 939.419, 'Ri');
  closeLen(r.Re, 1094.169, 'Re');
  closeLen(r.Li!, 461.951, 'Li');
  closeLen(r.Le!, 538.049, 'Le');
  closeAng(r.coupeDeg!, 14.2333, 'coupe');
  closeLen(r.EiMin, 60.581, 'Ei min');
  closeLen(r.EiMax, 89.419, 'Ei max');
  closeLen(r.EeMin, 60.581, 'Ee min');
  closeLen(r.EeMax, 94.169, 'Ee max');
  assert.equal(r.n, 2, 'n');
  closeAng(r.betaResidualDeg, 3.0668, 'βr');
  closeLen(r.residualChord, 54.418, 'cr');
});

// --- Invariants sur les cinq cas ---
const INV_TOL = 1e-9;
const cases: Array<{ label: string; input: Parameters<typeof computeArc2Poly>[0] }> = [
  { label: 'T1', input: { type: 1, Ra: 2000, B: 200, Lm: 400, beta: 90 } },
  { label: 'T2', input: { type: 2, Ra: 2000, B: 200, Lm: 400, beta: 90 } },
  { label: 'T3', input: { type: 3, Ra: 2000, B: 200, Lm: 400, j: 0, beta: 90 } },
  { label: 'T4', input: { type: 3, Ra: 2000, B: 200, Lm: 400, j: 5, beta: 90 } },
  { label: 'T5', input: { type: 1, Ra: 1000, B: 150, Lm: 500, beta: 60 } },
];

test('Invariant — Ei_min = Ee_min (contrainte de centrage)', () => {
  for (const c of cases) {
    const r = ok(c.input);
    assert.ok(
      Math.abs(r.EiMin - r.EeMin) < INV_TOL,
      `${c.label}: Ei_min=${r.EiMin} vs Ee_min=${r.EeMin}`,
    );
  }
});

test('Invariant — Ee_min + Ei_max = B (les trois types)', () => {
  for (const c of cases) {
    const r = ok(c.input);
    const B = c.input.B;
    assert.ok(
      Math.abs(r.EeMin + r.EiMax - B) < INV_TOL,
      `${c.label}: Ee_min+Ei_max=${r.EeMin + r.EiMax} vs B=${B}`,
    );
  }
});

test('Invariant — type 1 : Ee_max + Ei_min = B / cos u', () => {
  const t1 = ok({ type: 1, Ra: 2000, B: 200, Lm: 400, beta: 90 });
  closeLen(t1.EeMax + t1.EiMin, 200 / Math.cos(t1.u), 'T1 Ee_max+Ei_min');
  closeLen(t1.EeMax + t1.EiMin, 201.002254, 'T1 valeur attendue');
  const t5 = ok({ type: 1, Ra: 1000, B: 150, Lm: 500, beta: 60 });
  closeLen(t5.EeMax + t5.EiMin, 154.750436, 'T5 valeur attendue');
});

test('Invariant — type 3 : Ee_max + Ei_min < B strictement (test anti-régression Ri)', () => {
  const t3 = ok({ type: 3, Ra: 2000, B: 200, Lm: 400, j: 0, beta: 90 });
  assert.ok(t3.EeMax + t3.EiMin < 200, `T3: ${t3.EeMax + t3.EiMin} < 200`);
  closeLen(t3.EeMax + t3.EiMin, 199.474997, 'T3 valeur attendue');
  const t4 = ok({ type: 3, Ra: 2000, B: 200, Lm: 400, j: 5, beta: 90 });
  assert.ok(t4.EeMax + t4.EiMin < 200, `T4: ${t4.EeMax + t4.EiMin} < 200`);
  closeLen(t4.EeMax + t4.EiMin, 199.461824, 'T4 valeur attendue');
});

// --- Cas d'erreur ---
function expectError(input: Parameters<typeof computeArc2Poly>[0], code: string): void {
  const outcome = computeArc2Poly(input);
  assert.equal(outcome.ok, false, `attendu erreur ${code} pour ${JSON.stringify(input)}`);
  if (outcome.ok) throw new Error('unreachable');
  assert.equal(outcome.error.code, code, `code attendu ${code}, reçu ${outcome.error.code}`);
}

test('Erreur V4 — corde supérieure au diamètre', () => {
  expectError({ type: 1, Ra: 2000, B: 200, Lm: 4500, beta: 90 }, 'V4');
});
test('Erreur V5 — largeur incompatible avec le rayon (type 2)', () => {
  expectError({ type: 2, Ra: 100, B: 200, Lm: 150, beta: 90 }, 'V5');
});
test('Erreur V8 — α au-delà de 45° (blocage)', () => {
  // Ra=500 B=200 Lm=400 : en type 2 la solution fermée donne α ≈ 56° > 45° → V8.
  // (En type 1 le même triplet donne α ≈ 44,9°, tout juste valide — le prompt ne fixe
  // pas le type de ce cas d'erreur ; seul le type 2/3 dépasse franchement 45°.)
  expectError({ type: 2, Ra: 500, B: 200, Lm: 400, beta: 90 }, 'V8');
});
test('Erreur V3 — jeu négatif (type 3)', () => {
  expectError({ type: 3, Ra: 2000, B: 200, Lm: 400, j: -1, beta: 90 }, 'V3');
});
test('Erreur V2 — ouverture hors domaine', () => {
  expectError({ type: 1, Ra: 2000, B: 200, Lm: 400, beta: 400 }, 'V2');
});
