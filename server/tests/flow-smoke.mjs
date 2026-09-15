/**
 * The customs → quick quiz → gate → report flow, against a running API.
 *
 *   node tests/flow-smoke.mjs            (expects the server on :5000)
 *
 * Guards the bug this flow was rebuilt for: choosing DevOps Engineer at the
 * gate must produce a DevOps Engineer report, whatever the quiz's top match.
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.API_BASE || 'http://localhost:5000/api';

let cookies = '';
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies ? { Cookie: cookies } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) {
    const jar = new Map(cookies.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c]));
    for (const c of set) { const pair = c.split(';')[0]; jar.set(pair.split('=')[0], pair); }
    cookies = [...jar.values()].join('; ');
  }
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const check = (label, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? '✔' : '✖'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
};

const email = `flow_${Date.now()}@pathseeker.test`;
let r = await call('POST', '/auth/register', {
  name: 'Flow Tester', email, password: 'pathseeker123', confirmPassword: 'pathseeker123',
});
check('register', r.status === 201, `got ${r.status}`);

// ── Picked a field, no quiz ─────────────────────────────────────────
r = await call('PATCH', '/users/me/field', { fieldSlug: 'technology' });
check('declare technology at customs', r.status === 200, `got ${r.status}`);

r = await call('GET', '/results/me/career/devops-engineer');
check('report before any quiz is the chosen career', r.json.career?.slug === 'devops-engineer', r.json.career?.slug);
check('and carries no invented score', r.json.match === null);

// ── Not sure: the seven questions ───────────────────────────────────
r = await call('GET', '/quiz?mode=quick');
const qs = r.json.questions || [];
check('quick mode serves exactly 7 questions', qs.length === 7, `got ${qs.length}`);

// The client never sees weights, so the persona is built from the seed: on
// every question, the answer that leans hardest toward technology.
const seed = [
  ...JSON.parse(readFileSync(new URL('../src/seed/questions.json', import.meta.url))),
  ...JSON.parse(readFileSync(new URL('../src/seed/questions.variants.json', import.meta.url))),
  ...JSON.parse(readFileSync(new URL('../src/seed/questions.field.json', import.meta.url))),
  ...JSON.parse(readFileSync(new URL('../src/seed/questions.fields2.json', import.meta.url))),
];
const techAnswer = (q) => {
  const src = seed.find((s) => s.prompt === q.prompt);
  const best = [...src.options].sort((a, b) => (b.fieldWeights?.technology || 0) - (a.fieldWeights?.technology || 0))[0];
  return q.options.find((o) => o.key === best.key).id;
};

r = await call('POST', '/quiz/submit', {
  mode: 'quick',
  answers: qs.map((q) => ({ questionId: q.id, optionId: techAnswer(q) })),
});
check('quick submission accepted', r.status === 201, `${r.status} ${r.json.message || ''}`);
const top = r.json.result?.matches?.[0];
console.log(`    top match: ${top?.career?.title} ${top?.score}%`);
check('a build-and-fix persona lands in technology', top?.career?.field?.slug === 'technology', top?.career?.field?.slug);

r = await call('POST', '/quiz/submit', {
  mode: 'quick',
  answers: qs.slice(0, 6).map((q) => ({ questionId: q.id, optionId: techAnswer(q) })),
});
check('a partial quick quiz is rejected', r.status === 400, `got ${r.status}`);

// ── The gate choice is what the report is about ─────────────────────
r = await call('GET', '/results/me/career/devops-engineer');
check('flying to DevOps gives a DevOps report', r.json.career?.slug === 'devops-engineer', r.json.career?.slug);
check('with a real score and rank', r.json.match?.score > 0 && r.json.match?.rank >= 1, JSON.stringify(r.json.match));
console.log(`    devops: ${r.json.match?.score}% · #${r.json.match?.rank} of ${r.json.match?.of}; best: ${r.json.best?.career?.title ?? '(this one)'}`);

r = await call('GET', `/results/me/career/${top.career.slug}`);
check('the top match reports itself as best (no comparison)', r.json.best === null && r.json.match?.rank === 1, JSON.stringify(r.json.best));
check('and its score agrees with the stored result', Math.abs(r.json.match?.score - top.score) <= 1, `${r.json.match?.score} vs ${top.score}`);

r = await call('GET', '/results/me/career/not-a-career');
check('unknown career is a 404', r.status === 404, `got ${r.status}`);

// Full quiz still works unchanged.
r = await call('GET', '/quiz');
check('full quiz still serves every slot', (r.json.questions || []).length === 31, `got ${(r.json.questions || []).length}`);

r = await call('GET', '/career-fields');
check('all twenty fields are served', (r.json.fields || []).length === 20, `got ${(r.json.fields || []).length}`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
