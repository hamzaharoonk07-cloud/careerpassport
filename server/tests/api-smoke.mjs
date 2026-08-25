/**
 * End-to-end smoke test against a running API.
 *
 *   node tests/api-smoke.mjs            (expects the server on :5000)
 *
 * Walks the whole journey the way the client will: register, choose a
 * field, take the quiz, read the result, save a career, browse the bank.
 * Keeps its own cookie jar so the httpOnly auth cookies are exercised
 * exactly as a browser would exercise them.
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.API_BASE || 'http://localhost:5000/api';

// Derived from the seed rather than hardcoded, so adding a career does not
// fail a test that has nothing to do with the change.
const SEEDED_CAREERS =
  JSON.parse(readFileSync(new URL('../src/seed/careers.part1.json', import.meta.url))).length +
  JSON.parse(readFileSync(new URL('../src/seed/careers.part2.json', import.meta.url))).length;

let cookies = '';
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies ? { Cookie: cookies } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) {
    const jar = new Map(cookies.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c]));
    for (const c of setCookie) {
      const pair = c.split(';')[0];
      jar.set(pair.split('=')[0], pair);
    }
    cookies = [...jar.values()].join('; ');
  }

  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

const email = `smoke_${Date.now()}@pathseeker.test`;

// ── Auth ───────────────────────────────────────────────────────────
section('Auth');

let r = await call('POST', '/auth/register', {
  name: 'Muhammad Hammad',
  email,
  password: 'pathseeker123',
  confirmPassword: 'pathseeker123',
});
check('register returns 201', r.status === 201, `got ${r.status}`);
check('a passport number is issued', /^PS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(r.json.user?.passportNumber || ''), r.json.user?.passportNumber);
check('password hash never leaves the server', !JSON.stringify(r.json).includes('passwordHash'));

r = await call('POST', '/auth/register', { name: 'A B', email, password: 'pathseeker123', confirmPassword: 'pathseeker123' });
check('duplicate email rejected with 409', r.status === 409, `got ${r.status}`);

r = await call('POST', '/auth/register', { name: 'A', email: 'nope', password: 'sh', confirmPassword: 'x' });
check('validation returns field-level errors', r.status === 400 && Object.keys(r.json.details || {}).length >= 3, JSON.stringify(r.json.details));

r = await call('GET', '/auth/me');
check('GET /auth/me works with the session cookie', r.status === 200 && r.json.user?.email === email);

// ── Career fields ──────────────────────────────────────────────────
section('Career fields');
r = await call('GET', '/career-fields');
check('six fields are seeded', r.json.fields?.length === 6, `got ${r.json.fields?.length}`);

r = await call('PATCH', '/users/me/field', { fieldSlug: 'technology' });
check('selecting a field succeeds', r.status === 200 && r.json.selectedField?.slug === 'technology');
check('journey stage advances to field-selected', r.json.journeyStage === 'field-selected', r.json.journeyStage);

r = await call('PATCH', '/users/me/field', { fieldSlug: 'not-a-field' });
check('unknown field is rejected', r.status === 400);

// ── Quiz ───────────────────────────────────────────────────────────
section('Quiz');
r = await call('GET', '/quiz');
const questions = r.json.questions || [];
check('ten questions are served', questions.length === 10, `got ${questions.length}`);
check('scoring weights are not exposed to the client', !/fieldWeights|riasec/.test(JSON.stringify(r.json)));
check('every question has four options', questions.every((q) => q.options.length === 4));

const answersA = questions.map((q) => ({ questionId: q.id, optionId: q.options.find((o) => o.key === 'a').id }));

r = await call('POST', '/quiz/submit', { answers: answersA.slice(0, 4) });
check('a partial quiz is rejected', r.status === 400, `got ${r.status}: ${r.json.message}`);

r = await call('POST', '/quiz/submit', {
  answers: [{ questionId: questions[0].id, optionId: questions[1].options[0].id }, ...answersA.slice(1)],
});
check('an option from the wrong question is rejected', r.status === 400);

r = await call('POST', '/quiz/submit', { answers: answersA });
check('full submission returns 201', r.status === 201, `got ${r.status}: ${r.json.message}`);

const result = r.json.result;
check('matches are returned', (result?.matches?.length || 0) >= 5, `got ${result?.matches?.length}`);
check('matches are sorted highest first', result.matches.every((m, i, a) => i === 0 || a[i - 1].score >= m.score));
check('every score is between 0 and 100', result.matches.every((m) => m.score >= 0 && m.score <= 100));
check('the builder persona is matched to technology', result.matches[0].career.field.slug === 'technology', result.matches[0].career.title);
check('the top match carries reasons', result.matches[0].reasons.length >= 2);
check('the top career has a six-stage roadmap', result.matches[0].career.roadmap?.length === 6);
check('a score breakdown is stored', typeof result.matches[0].breakdown?.riasec === 'number');
check('dominant axes are recorded', result.dominantAxes?.length === 2, JSON.stringify(result.dominantAxes));

console.log(`     → top match: ${result.matches[0].career.title} at ${result.matches[0].score}%`);
console.log(`     → reason: ${result.matches[0].reasons[0]}`);

// Determinism: the same answers from a second account must score identically.
const savedCookies = cookies;
cookies = '';
await call('POST', '/auth/register', {
  name: 'Twin Test',
  email: `twin_${Date.now()}@pathseeker.test`,
  password: 'pathseeker123',
  confirmPassword: 'pathseeker123',
});
await call('PATCH', '/users/me/field', { fieldSlug: 'technology' });
const twin = await call('POST', '/quiz/submit', { answers: answersA });
check(
  'identical answers produce identical scores (deterministic)',
  JSON.stringify(twin.json.result.matches.map((m) => m.score)) ===
    JSON.stringify(result.matches.map((m) => m.score))
);
cookies = savedCookies;

// ── Results ────────────────────────────────────────────────────────
section('Results');
r = await call('GET', '/results/me');
check('latest result is retrievable', r.status === 200 && r.json.result?.matches?.length > 0);
const resultId = r.json.result._id;

r = await call('GET', '/results/me/all');
check('result history is listed', Array.isArray(r.json.results) && r.json.results.length >= 1);

const otherCookies = cookies;
cookies = '';
await call('POST', '/auth/register', {
  name: 'Nosy Person',
  email: `nosy_${Date.now()}@pathseeker.test`,
  password: 'pathseeker123',
  confirmPassword: 'pathseeker123',
});
r = await call('GET', `/results/${resultId}`);
check("another user cannot read someone else's result", r.status === 403, `got ${r.status}`);
cookies = otherCookies;

// ── Career bank ────────────────────────────────────────────────────
section('Career bank');
r = await call('GET', '/careers?limit=60');
check(
  `all ${SEEDED_CAREERS} seeded careers are listed`,
  r.json.total === SEEDED_CAREERS,
  `got ${r.json.total}`
);

r = await call('GET', '/careers?field=healthcare');
check('field filter works', r.json.careers?.length === 6 && r.json.careers.every((c) => c.field.slug === 'healthcare'));

r = await call('GET', '/careers?q=design');
check('search returns results', (r.json.careers?.length || 0) > 0, `got ${r.json.careers?.length}`);

r = await call('GET', '/careers?skill=Typography');
check('skill filter works', (r.json.careers?.length || 0) > 0, `got ${r.json.careers?.length}`);

r = await call('GET', '/careers?page=2&limit=10');
check('paging works', r.json.page === 2 && r.json.careers.length === 10);

r = await call('GET', '/careers/software-engineer');
check('a career is fetchable by slug', r.json.career?.title === 'Software Engineer');
check('salary data is present where we have it', r.json.career?.salary?.entry != null);
check('related careers are linked', (r.json.career?.related?.length || 0) > 0);

r = await call('GET', '/careers/industrial-designer');
check('careers without salary data return null, not a made-up number', r.json.career?.salary?.entry === null);
check('hasSalaryData virtual reports false for those', r.json.career?.hasSalaryData === false);

r = await call('GET', '/careers/does-not-exist');
check('unknown career returns 404', r.status === 404);

// ── Saved careers ──────────────────────────────────────────────────
section('Saved careers');
r = await call('POST', '/saved-careers', { careerId: 'software-engineer', note: 'Top match' });
check('saving a career works', r.status === 201);

r = await call('POST', '/saved-careers', { careerId: 'software-engineer' });
check('saving twice is handled, not duplicated', r.status === 200 && r.json.alreadySaved === true);

r = await call('GET', '/saved-careers');
check('saved list returns the career', r.json.saved?.length === 1 && r.json.saved[0].career.title === 'Software Engineer');

r = await call('DELETE', '/saved-careers/software-engineer');
check('unsaving works', r.status === 200);

r = await call('GET', '/saved-careers');
check('saved list is empty again', r.json.saved?.length === 0);

// ── Session ────────────────────────────────────────────────────────
section('Session');
r = await call('POST', '/auth/refresh');
check('refresh issues a new session', r.status === 200 && r.json.user?.email);

r = await call('POST', '/auth/logout');
check('logout succeeds', r.status === 200);

r = await call('GET', '/auth/me');
check('after logout the session is gone', r.status === 401, `got ${r.status}`);

r = await call('POST', '/auth/login', { email, password: 'wrong-password' });
check('wrong password is rejected', r.status === 401);
check('the error does not reveal whether the email exists', r.json.message === 'Email or password is incorrect.', r.json.message);

r = await call('POST', '/auth/login', { email, password: 'pathseeker123' });
check('login succeeds with the right password', r.status === 200 && r.json.user?.email === email);
check('journey progress survived the logout', r.json.user?.journeyStage === 'result', r.json.user?.journeyStage);

// ── Summary ────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(46)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(46)}\n`);
process.exit(failed === 0 ? 0 : 1);
