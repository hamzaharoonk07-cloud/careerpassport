import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import {
  buildUserProfile,
  computeCeilings,
  rankCareers,
  WEIGHTS,
  _internals,
} from '../src/services/recommendation.service.js';

const require = createRequire(import.meta.url);
const questions = require('../src/seed/questions.json');
const careersRaw = [
  ...require('../src/seed/careers.part1.json'),
  ...require('../src/seed/careers.part2.json'),
];

/** Shapes the seed JSON like the populated Mongoose docs the engine expects. */
const careers = careersRaw.map((c, i) => ({
  _id: `id_${i}`,
  title: c.title,
  slug: c.slug,
  riasec: c.riasec,
  field: { slug: c.field },
}));

/** Picks option `key` on every question — a crude but deterministic persona. */
const pickAll = (key) => questions.map((q) => q.options.find((o) => o.key === key));

/** Picks a specific option per question order, e.g. { 1: 'a', 2: 'd' }. */
const pickMap = (map, fallback = 'a') =>
  questions.map((q) => q.options.find((o) => o.key === (map[q.order] || fallback)));

test('weights sum to exactly 1', () => {
  const total = WEIGHTS.riasec + WEIGHTS.field + WEIGHTS.chosenField;
  assert.equal(Number(total.toFixed(10)), 1);
});

test('ceilings are non-zero for every axis and every field', () => {
  const { riasec, field } = computeCeilings(questions);
  for (const [k, v] of Object.entries(riasec)) assert.ok(v > 0, `axis ${k} unreachable`);
  for (const [k, v] of Object.entries(field)) assert.ok(v > 0, `field ${k} unreachable`);
});

test('normalisation puts every axis on a comparable 0-10 scale', () => {
  // A user who maxed out every axis would score 10 on all of them.
  const { riasec: ceil } = computeCeilings(questions);
  const maxed = Object.fromEntries(Object.keys(ceil).map((k) => [k, ceil[k]]));
  const fake = [{ riasec: maxed, fieldWeights: {} }];
  const { riasecVector } = buildUserProfile(fake, questions);
  for (const [k, v] of Object.entries(riasecVector)) {
    assert.ok(Math.abs(v - 10) < 0.0001, `axis ${k} should normalise to 10, got ${v}`);
  }
});

test('the engine is deterministic — identical answers give identical results', () => {
  const chosen = pickAll('a');
  const first = rankCareers(buildUserProfile(chosen, questions), careers, 'technology');
  const second = rankCareers(buildUserProfile(chosen, questions), careers, 'technology');
  assert.deepEqual(
    first.map((m) => [m.careerDoc.slug, m.score]),
    second.map((m) => [m.careerDoc.slug, m.score])
  );
});

test('a technology-leaning persona gets a technology career on top', () => {
  // Option 'a' is the build/analyse choice on most questions.
  const profile = buildUserProfile(pickAll('a'), questions);
  const matches = rankCareers(profile, careers, 'technology');
  assert.equal(matches[0].careerDoc.field.slug, 'technology');
  assert.ok(matches[0].score >= 70, `expected a strong top score, got ${matches[0].score}`);
});

test('a people-leaning persona gets a healthcare or social career on top', () => {
  // Option 'd' is the helping/people-facing choice on most questions.
  const profile = buildUserProfile(pickAll('d'), questions);
  const matches = rankCareers(profile, careers, 'healthcare');
  assert.equal(matches[0].careerDoc.field.slug, 'healthcare');
});

test('a creative persona gets a design or media career on top', () => {
  const profile = buildUserProfile(pickAll('b'), questions);
  const matches = rankCareers(profile, careers, 'design');
  assert.ok(['design', 'media'].includes(matches[0].careerDoc.field.slug));
});

test('different personas produce genuinely different top careers', () => {
  const tops = ['a', 'b', 'c', 'd'].map((k) => {
    const profile = buildUserProfile(pickAll(k), questions);
    return rankCareers(profile, careers, null)[0].careerDoc.slug;
  });
  assert.equal(new Set(tops).size, 4, `expected 4 distinct top matches, got ${tops.join(', ')}`);
});

test('choosing a field shifts results toward it without overwhelming the quiz', () => {
  const profile = buildUserProfile(pickAll('a'), questions); // strongly technical answers
  const withFinance = rankCareers(profile, careers, 'finance');
  const withNone = rankCareers(profile, careers, null);

  // The chosen field bonus is 10 points — enough to matter, not enough to override.
  const financeTop = withFinance.find((m) => m.careerDoc.field.slug === 'finance');
  const financeNone = withNone.find((m) => m.careerDoc.field.slug === 'finance');
  if (financeTop && financeNone) {
    assert.ok(financeTop.score > financeNone.score, 'chosen field should raise that field');
  }
  // A technical persona should still not be told to become an accountant.
  assert.equal(withFinance[0].careerDoc.field.slug, 'technology');
});

test('scores stay inside 0-100 for every persona and every career', () => {
  for (const k of ['a', 'b', 'c', 'd']) {
    const profile = buildUserProfile(pickAll(k), questions);
    for (const m of rankCareers(profile, careers, null, 36)) {
      assert.ok(m.score >= 0 && m.score <= 100, `score out of range: ${m.score}`);
    }
  }
});

test('every match carries at least two reasons, none of them empty', () => {
  const profile = buildUserProfile(pickAll('c'), questions);
  for (const m of rankCareers(profile, careers, 'business')) {
    assert.ok(m.reasons.length >= 2, `${m.careerDoc.slug} has ${m.reasons.length} reasons`);
    for (const r of m.reasons) assert.ok(r.trim().length > 20, `weak reason: "${r}"`);
  }
});

test('reasons quote numbers that match the score breakdown', () => {
  const profile = buildUserProfile(pickAll('a'), questions);
  const top = rankCareers(profile, careers, 'technology')[0];
  const fieldPct = Math.round(profile.fieldScores.technology);
  const quoted = top.reasons.some((r) => r.includes(String(fieldPct)));
  assert.ok(quoted, `no reason quoted the real field score of ${fieldPct}%`);
});

test('a mixed persona still produces a usable spread rather than a flat list', () => {
  const profile = buildUserProfile(pickMap({ 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'a', 6: 'b', 7: 'c', 8: 'd', 9: 'a', 10: 'b' }), questions);
  const all = rankCareers(profile, careers, null, 36);
  const spread = all[0].score - all[all.length - 1].score;
  assert.ok(spread >= 15, `scores too flat to be informative (spread ${spread})`);
});

test('cosine similarity behaves', () => {
  const { cosineSimilarity } = _internals;
  const v = { R: 5, I: 5, A: 5, S: 5, E: 5, C: 5 };
  assert.ok(Math.abs(cosineSimilarity(v, v) - 1) < 1e-9, 'identical vectors should score 1');
  const zero = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  assert.equal(cosineSimilarity(v, zero), 0, 'zero vector should not divide by zero');
});
