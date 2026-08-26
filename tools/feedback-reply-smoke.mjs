const B = 'http://localhost:5000/api';
const jar = {};
const call = async (who, m, p, body) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(jar[who] ? { Cookie: jar[who] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = r.headers.getSetCookie?.() || [];
  if (sc.length) jar[who] = sc.map((c) => c.split(';')[0]).join('; ');
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
let pass = 0, fail = 0;
const ok = (l, c) => { c ? (pass++, console.log('  ok   ' + l)) : (fail++, console.log('  FAIL ' + l)); };

// A signed-in traveller leaves feedback.
const email = 'reply' + Date.now() + '@example.com';
await call('user', 'POST', '/auth/register', { name: 'Reply Probe', email, password: 'probe12345', confirmPassword: 'probe12345' });
await call('user', 'POST', '/feedback', { type: 'query', rating: 4, message: 'How is the match percentage calculated?' });

const before = await call('user', 'GET', '/feedback/mine');
ok('traveller sees their own submission', before.feedback?.length === 1);
ok('no reply yet', !before.feedback[0].reply?.message);

// Admin replies.
await call('admin', 'POST', '/auth/login', { email: 'admin@pathseeker.app', password: 'admin1234' });
const list = await call('admin', 'GET', '/admin/feedback');
const target = list.feedback.find((f) => f.message.startsWith('How is the match'));
ok('admin sees it', Boolean(target));

const replied = await call('admin', 'PATCH', `/admin/feedback/${target._id}`, {
  reply: 'Sixty per cent trait similarity, thirty per cent field affinity, ten per cent the field you chose.',
});
ok('reply accepted', replied.status === 200);
ok('replying marks it resolved', replied.item?.status === 'resolved');

const after = await call('user', 'GET', '/feedback/mine');
ok('traveller sees the reply', after.feedback[0].reply?.message?.startsWith('Sixty per cent'));

// Scoping: a different account must not see it.
const other = 'other' + Date.now() + '@example.com';
await call('other', 'POST', '/auth/register', { name: 'Other', email: other, password: 'probe12345', confirmPassword: 'probe12345' });
const theirs = await call('other', 'GET', '/feedback/mine');
ok('another account sees none of it', (theirs.feedback || []).length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
