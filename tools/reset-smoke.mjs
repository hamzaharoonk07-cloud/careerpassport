import { readFileSync } from 'node:fs';
const LOG = 'C:/Users/LINKTR~1/AppData/Local/Temp/ps-api.log';
const B = 'http://localhost:5000/api';
const call = async (m, p, b) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
let pass = 0, fail = 0;
const ok = (l, c) => { c ? (pass++, console.log('  ok   ' + l)) : (fail++, console.log('  FAIL ' + l)); };

const email = 'happy' + Date.now() + '@example.com';
await call('POST', '/auth/register', { name: 'Happy Probe', email, password: 'original12345', confirmPassword: 'original12345' });
await call('POST', '/auth/forgot-password', { email });
await new Promise((r) => setTimeout(r, 600));

const log = readFileSync(LOG, 'utf8');
const line = log.split('\n').reverse().find((l) => l.includes(`reset code for ${email}`));
const code = line && line.match(/: (\d{6})/)?.[1];
ok('code written to the server log (stands in for the email)', Boolean(code));

if (code) {
  ok('reset succeeds with the real code',
    (await call('POST', '/auth/reset-password', { email, code, password: 'brandnew12345', confirmPassword: 'brandnew12345' })).status === 200);
  ok('old password no longer works',
    (await call('POST', '/auth/login', { email, password: 'original12345' })).status === 401);
  ok('new password works',
    (await call('POST', '/auth/login', { email, password: 'brandnew12345' })).status === 200);
  ok('the code cannot be reused',
    (await call('POST', '/auth/reset-password', { email, code, password: 'again12345', confirmPassword: 'again12345' })).status === 400);
}
console.log(`\n${pass} passed, ${fail} failed`);
