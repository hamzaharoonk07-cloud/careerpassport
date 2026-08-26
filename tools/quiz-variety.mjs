const B = 'http://localhost:5000/api';
let cookie = '';
const call = async (m, p, body) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
let pass = 0, fail = 0;
const ok = (l, c) => { c ? (pass++, console.log('  ok   ' + l)) : (fail++, console.log('  FAIL ' + l)); };

const email = 'quiz' + Date.now() + '@example.com';
await call('POST', '/auth/register', { name: 'Quiz Probe', email, password: 'probe12345', confirmPassword: 'probe12345' });

const first = await call('GET', '/quiz');
ok(`first attempt serves 10 questions (got ${first.questions?.length})`, first.questions?.length === 10);
ok('one question per slot, no duplicate slots',
  new Set(first.questions.map((q) => q.order)).size === first.questions.length);
ok('every dimension is covered once',
  new Set(first.questions.map((q) => q.dimension)).size === 10);

// Answer it so the attempt is recorded.
const answers = first.questions.map((q) => ({ questionId: q.id, optionId: q.options[0].id }));
const submitted = await call('POST', '/quiz/submit', { answers });
ok(`submit succeeds (${submitted.status})`, submitted.status === 200 || submitted.status === 201);

const second = await call('GET', '/quiz');
const a = new Set(first.questions.map((q) => q.id));
const repeated = second.questions.filter((q) => a.has(q.id));
ok(`retake repeats none of the first set (${repeated.length} repeats)`, repeated.length === 0);
ok('retake still covers all ten dimensions',
  new Set(second.questions.map((q) => q.dimension)).size === 10);

console.log(`\n${pass} passed, ${fail} failed`);
console.log('\nFirst attempt, slot 1:  ' + first.questions[0].prompt);
console.log('Second attempt, slot 1: ' + second.questions[0].prompt);
