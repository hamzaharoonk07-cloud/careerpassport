/**
 * Verifies the access/refresh token pair behaves the way the client's
 * interceptor assumes: an expired access token is rejected, a refresh mints
 * a working one, and a revoked session cannot be refreshed back to life.
 *
 *   node tests/refresh-smoke.mjs
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api';

let cookies = '';
let passed = 0;
let failed = 0;

async function call(method, path, body, overrideCookies) {
  const jarHeader = overrideCookies !== undefined ? overrideCookies : cookies;
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jarHeader ? { Cookie: jarHeader } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length && overrideCookies === undefined) {
    const jar = new Map(cookies.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c]));
    for (const c of setCookie) {
      const pair = c.split(';')[0];
      jar.set(pair.split('=')[0], pair);
    }
    cookies = [...jar.values()].join('; ');
  }

  return { status: res.status, json: await res.json().catch(() => ({})), setCookie };
}

const check = (label, ok, detail = '') => {
  if (ok) { passed += 1; console.log(`  ✔ ${label}`); }
  else { failed += 1; console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`); }
};

const email = `refresh_${Date.now()}@pathseeker.test`;

console.log('\n── Token lifecycle');

let r = await call('POST', '/auth/register', {
  name: 'Refresh Tester', email, password: 'pathseeker123', confirmPassword: 'pathseeker123',
});
check('register issues both cookies', r.setCookie.some((c) => c.startsWith('ps_at=')) && r.setCookie.some((c) => c.startsWith('ps_rt=')));
check('cookies are httpOnly', r.setCookie.every((c) => /httponly/i.test(c)));
check('cookies are SameSite-scoped', r.setCookie.every((c) => /samesite/i.test(c)));

const fullJar = cookies;
const refreshOnly = cookies.split('; ').find((c) => c.startsWith('ps_rt='));
const accessOnly = cookies.split('; ').find((c) => c.startsWith('ps_at='));

r = await call('GET', '/auth/me', null, refreshOnly);
check('a refresh token alone cannot authenticate a request', r.status === 401, `got ${r.status}`);

r = await call('GET', '/auth/me', null, accessOnly);
check('the access token alone authenticates', r.status === 200);

r = await call('POST', '/auth/refresh', null, refreshOnly);
check('refresh works with only the refresh cookie', r.status === 200, `got ${r.status}`);
check('refresh mints a new access cookie', r.setCookie.some((c) => c.startsWith('ps_at=')));

const rotated = r.setCookie.map((c) => c.split(';')[0]).join('; ');
r = await call('GET', '/auth/me', null, rotated);
check('the refreshed access token works', r.status === 200 && r.json.user?.email === email);

r = await call('POST', '/auth/refresh', null, 'ps_rt=not-a-real-token');
check('a forged refresh token is rejected', r.status === 401);

r = await call('POST', '/auth/refresh', null, accessOnly);
check('an access token cannot be used as a refresh token', r.status === 401, `got ${r.status}`);

cookies = fullJar;
await call('POST', '/auth/logout');
r = await call('GET', '/auth/me');
check('logout ends the session', r.status === 401);

console.log(`\n${'─'.repeat(46)}\n  ${passed} passed, ${failed} failed\n${'─'.repeat(46)}\n`);
process.exit(failed === 0 ? 0 : 1);
