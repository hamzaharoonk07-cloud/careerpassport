import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { CareersPanel } from '../components/admin/CareersPanel.jsx';
import { QuizPanel } from '../components/admin/QuizPanel.jsx';
import { MediaPanel, FeedbackPanel, StoriesPanel } from '../components/admin/ContentPanels.jsx';
import { Confirm, Empty } from '../components/admin/ui.jsx';
import { adminService } from '../services/admin.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/admin.css';
import '../styles/admin-panels.css';
import '../styles/tower.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const STAT_LABELS = {
  users: 'Registered',
  activeUsers: 'Active (30 days)',
  admins: 'Administrators',
  results: 'Quiz attempts',
  saved: 'Careers saved',
  careers: 'Destinations',
  fields: 'Route groups',
  answers: 'Answers recorded',
  media: 'Media items',
  feedbackNew: 'New feedback',
  stories: 'Published stories',
};

const TABS = [
  { id: 'overview', label: 'Overview', sub: 'How the site is doing',
    icon: <><path d="M4 20V11M10 20V5M16 20v-6M22 20H2" /></> },
  { id: 'careers', label: 'Careers', sub: 'The departures board',
    icon: <><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7M3 13h18" /></> },
  { id: 'quiz', label: 'Quiz & scoring', sub: 'Questions and weights',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17v.3" /></> },
  { id: 'media', label: 'Multimedia', sub: 'Shared videos and links',
    icon: <path d="M4 6.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5zM16.5 10.5l5-3v9l-5-3" /> },
  { id: 'feedback', label: 'Feedback', sub: 'Comment cards to answer',
    icon: <path d="M20 15.5a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /> },
  { id: 'stories', label: 'Success stories', sub: 'Published journeys',
    icon: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /> },
  { id: 'users', label: 'Users', sub: 'Passengers and roles',
    icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></> },
];

function TabIcon({ children, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/* ── Overview ───────────────────────────────────────────────── */

/** The last 14 days, oldest first, with empty days filled in as zero. */
function lastFortnight(series) {
  const byDay = new Map((series || []).map((d) => [d._id, d.count]));
  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: byDay.get(key) || 0, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }
  return days;
}

/** Headline number with the context that makes it mean something. */
function Kpi({ value, label, context, action }) {
  return (
    <div className="tw-kpi">
      <span className="tw-kpi__label">{label}</span>
      <span className="tw-kpi__value">{value}</span>
      <span className="tw-kpi__context">{context}</span>
      {action}
    </div>
  );
}

/** Vertical bars, one per day. Each bar carries its own tooltip and label. */
function SignupChart({ days }) {
  const peak = Math.max(...days.map((d) => d.count), 1);
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <figure className="tw-card tw-signups">
      <figcaption className="tw-card__head">
        <h3 className="tw-card__title">Sign-ups, last 14 days</h3>
        <span className="tw-card__meta">{total} new</span>
      </figcaption>
      <div className="tw-bars" role="img" aria-label={`Sign-ups per day for the last 14 days, ${total} in total`}>
        {[1, 0.5, 0].map((f) => (
          <span key={f} className="tw-bars__grid" style={{ bottom: `${f * 100}%` }}>
            <span>{Math.round(peak * f)}</span>
          </span>
        ))}
        {days.map((d) => (
          <div className="tw-bars__col" key={d.key} tabIndex={0}>
            <span className="tw-bars__bar" style={{ height: `${(d.count / peak) * 100}%` }} />
            <span className="tw-tip" role="tooltip">{d.label}: <b>{d.count}</b> sign-up{d.count === 1 ? '' : 's'}</span>
          </div>
        ))}
      </div>
      <div className="tw-bars__axis">
        <span>{days[0].label}</span>
        <span>Today</span>
      </div>
      {/* The same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <caption>Sign-ups per day</caption>
        <tbody>{days.map((d) => <tr key={d.key}><th>{d.label}</th><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** A ranked list drawn as horizontal bars against the leader. */
function Ranking({ title, note, rows, empty }) {
  const peak = Math.max(...rows.map((r) => r.count), 1);
  return (
    <section className="tw-card">
      <div className="tw-card__head">
        <h3 className="tw-card__title">{title}</h3>
        <span className="tw-card__meta">{note}</span>
      </div>
      {rows.length ? (
        <ol className="tw-rank">
          {rows.map((r, i) => (
            <li key={r.slug} className="tw-rank__row">
              <span className="tw-rank__n">{i + 1}</span>
              <span className="tw-rank__body">
                <span className="tw-rank__top">
                  <Link to={`/careers/${r.slug}`} className="tw-rank__title">{r.title}</Link>
                  <span className="tw-rank__count">{r.count}</span>
                </span>
                <span className="tw-rank__track"><span style={{ width: `${(r.count / peak) * 100}%` }} /></span>
              </span>
            </li>
          ))}
        </ol>
      ) : <p className="tw-empty">{empty}</p>}
    </section>
  );
}

function Overview({ stats, topMatches, topSaved, fb, signups, onOpen }) {
  if (!stats) return <p className="tw-empty">Loading the tower…</p>;
  const days = lastFortnight(signups);
  const peakRating = Math.max(...(fb?.byRating || []).map((r) => r.count), 1);

  return (
    <div className="tw-overview">
      <div className="tw-kpis">
        <Kpi
          label="Travellers"
          value={stats.users}
          context={`${stats.activeUsers} signed in during the last 30 days`}
        />
        <Kpi
          label="Quiz attempts"
          value={stats.results}
          context={`${stats.answers} answers recorded`}
        />
        <Kpi
          label="Feedback to answer"
          value={stats.feedbackNew}
          context={fb?.total ? `${fb.total} received, ${fb.replied} replied to` : 'Nothing received yet'}
          action={stats.feedbackNew > 0 && (
            <button type="button" className="tw-kpi__go" onClick={() => onOpen('feedback')}>Open feedback</button>
          )}
        />
        <Kpi
          label="Careers on the board"
          value={stats.careers}
          context={`Across ${stats.fields} fields`}
          action={<button type="button" className="tw-kpi__go" onClick={() => onOpen('careers')}>Manage careers</button>}
        />
      </div>

      <div className="tw-row tw-row--chart">
        <SignupChart days={days} />

        <section className="tw-card tw-fb">
          <div className="tw-card__head">
            <h3 className="tw-card__title">Feedback ratings</h3>
            <span className="tw-card__meta">{fb?.total || 0} cards</span>
          </div>
          {fb?.total ? (
            <>
              <div className="tw-fb__avg">
                <span className="tw-fb__avg-n">{fb.averageRating}</span>
                <span className="tw-fb__avg-k">average out of 5</span>
              </div>
              <div className="tw-fb__spread">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = fb.byRating.find((r) => r.rating === n)?.count || 0;
                  return (
                    <div className="tw-fb__row" key={n} title={`${count} rated ${n}`}>
                      <span className="tw-fb__k">{n}</span>
                      <span className="tw-rank__track"><span style={{ width: `${(count / peakRating) * 100}%` }} /></span>
                      <span className="tw-fb__c">{count}</span>
                    </div>
                  );
                })}
              </div>
              <ul className="tw-fb__types">
                {fb.byType.map((t) => (
                  <li key={t.type}><span>{t.type}</span><b>{t.count}</b></li>
                ))}
              </ul>
            </>
          ) : <p className="tw-empty">No feedback yet. Ratings appear here as cards come in.</p>}
        </section>
      </div>

      <div className="tw-row">
        <Ranking title="Most matched" note="Where the quiz sends people" rows={topMatches} empty="No quiz results yet." />
        <Ranking title="Most saved" note="What people bookmark" rows={topSaved} empty="Nothing saved yet." />
      </div>

      <dl className="tw-minor">
        <div><dt>Administrators</dt><dd>{stats.admins}</dd></div>
        <div><dt>Careers saved</dt><dd>{stats.saved}</dd></div>
        <div><dt>Media on air</dt><dd>{stats.media}</dd></div>
        <div><dt>Published stories</dt><dd>{stats.stories}</dd></div>
      </dl>
    </div>
  );
}

/* ── Users ──────────────────────────────────────────────────── */

function UsersPanel({ onError, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (opts = {}) => {
    try {
      const d = await adminService.users({ q: opts.q ?? q, page: opts.page ?? page, limit: 20 });
      setUsers(d.users); setTotal(d.total); setPages(d.pages);
    } catch (e) { onError(apiError(e)); }
  }, [q, page, onError]);

  useEffect(() => { load(); }, []);

  const open = async (id) => {
    setDetail({ loading: true });
    try { setDetail(await adminService.user(id)); }
    catch (e) { setDetail(null); onError(apiError(e)); }
  };

  const toggleRole = async (u) => {
    try {
      await adminService.setRole(u._id, u.role === 'admin' ? 'user' : 'admin');
      await load();
      if (detail?.user?._id === u._id) open(u._id);
    } catch (e) { onError(apiError(e)); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await adminService.deleteUser(removing._id);
      // Repeated verbatim: it names exactly what went with the account.
      setNotice(res.message);
      setRemoving(null);
      setDetail(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Users</h2>
          <p className="apanel__sub">{total} registered.</p>
        </div>
      </header>

      {notice && <p className="anotice" role="status">{notice}</p>}

      <input
        className="af__input apanel__search"
        type="search"
        placeholder="Search name, email or passport…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); load({ q: e.target.value, page: 1 }); }}
        aria-label="Search users"
      />

      <div className="adm__table">
        <div className="adm__head"><span>Passport</span><span>Name</span><span>Email</span><span>Class</span><span>Role</span><span>Joined</span></div>
        {users.map((u) => (
          <button type="button" className="adm__row" key={u._id} onClick={() => open(u._id)}>
            <span className="adm__pass">{u.passportNumber}</span>
            <span className="adm__name">{u.name}</span>
            <span className="adm__email">{u.email}</span>
            <span className="adm__stage">{u.accountType || '—'}</span>
            <span className={`adm__role ${u.role === 'admin' ? 'adm__role--admin' : ''}`}>{u.role}</span>
            <span className="adm__stage">{fmtDate(u.createdAt)}</span>
          </button>
        ))}
        {!users.length && <Empty>No users match that search.</Empty>}
      </div>

      {pages > 1 && (
        <div className="bank__pager">
          <Button variant="ghost" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load({ page: p }); }}>← Previous</Button>
          <span className="bank__pager-n">Page {page} of {pages}</span>
          <Button variant="ghost" disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load({ page: p }); }}>Next →</Button>
        </div>
      )}

      {detail && !detail.loading && (
        <section className="adm__detail">
          <div className="adm__detail-head">
            <div>
              <p className="t-eyebrow">{detail.user.passportNumber}</p>
              <h3 className="t-h3" style={{ marginTop: 'var(--sp-2)' }}>{detail.user.name}</h3>
              <p className="adm__email" style={{ marginTop: 'var(--sp-2)' }}>{detail.user.email}</p>
            </div>
            <div className="row" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant={detail.user.role === 'admin' ? 'danger' : 'secondary'}
                onClick={() => toggleRole(detail.user)}
                disabled={String(detail.user._id) === String(currentUserId)}
              >
                {detail.user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setRemoving(detail.user)}
                disabled={String(detail.user._id) === String(currentUserId)}
              >
                Delete account
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>

          <div className="adm__sub">
            <p className="t-eyebrow">Quiz results ({detail.results.length})</p>
            {detail.results.length ? (
              <ul className="adm__list">
                {detail.results.map((r) => (
                  <li key={r._id}>
                    <b>{r.matches?.[0]?.career?.title || 'No match'}</b>
                    <span className="t-mono">{r.matches?.[0]?.score ?? '—'}% · {fmtDate(r.takenAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Has not taken the quiz.</Empty>}
          </div>

          <div className="adm__sub">
            <p className="t-eyebrow">Saved careers ({detail.saved.length})</p>
            {detail.saved.length ? (
              <ul className="adm__list">
                {detail.saved.map((s) => (
                  <li key={s._id}>
                    <b><Link to={`/careers/${s.career.slug}`}>{s.career.title}</Link></b>
                    <span className="t-mono">{fmtDate(s.savedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nothing saved.</Empty>}
          </div>
        </section>
      )}

      {removing && (
        <Confirm
          title={`Delete ${removing.name}`}
          body={`${removing.email} and everything personal attached to it — quiz results, answers and bookmarks — will be removed permanently. Any feedback they left is kept but anonymised, since it is about the product rather than the person. This cannot be undone.`}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}

/* ── Shell ──────────────────────────────────────────────────── */

/**
 * Admin panel.
 *
 * Every request goes to /api/admin/*, which requires both a session and the
 * admin role server-side. This page hides itself from non-admins as a
 * courtesy — the API is what actually refuses them.
 */
export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [topSaved, setTopSaved] = useState([]);
  const [fb, setFb] = useState(null);
  const [signups, setSignups] = useState([]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.stats()
      .then((d) => { setStats(d.stats); setTopMatches(d.topMatches || []); setTopSaved(d.topSaved || []); setFb(d.feedbackAnalytics || null); setSignups(d.signupsByDay || []); })
      .catch((e) => setError(apiError(e)));
  }, []);

  if (user && user.role !== 'admin') {
    return (
      <div className="page wrap center-screen" style={{ textAlign: 'center' }}>
        <div>
          <h1 className="t-h2">Not your gate</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
            This area is for administrators. The API refuses it too — this page is only being polite.
          </p>
          <div style={{ marginTop: 'var(--sp-6)' }}><Button to="/dashboard">Back to dashboard</Button></div>
        </div>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab);
  const badge = { feedback: stats?.feedbackNew, careers: stats?.careers, users: stats?.users, media: stats?.media, stories: stats?.stories };

  return (
    <div className="page wrap tw">
      <aside className="tw-side">
        <div className="tw-brand">
          <span className="tw-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8M10 21l1-9h2l1 9M7.5 8h9l-1.5 4h-6zM9 8V5.5A3 3 0 0 1 15 5.5V8M12 2.5v0" />
            </svg>
          </span>
          <span>
            <span className="tw-brand__name">Control tower</span>
            <span className="tw-brand__sub">PathSeeker admin</span>
          </span>
        </div>

        <nav className="tw-nav" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tw-nav__item"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <TabIcon>{t.icon}</TabIcon>
              <span className="tw-nav__label">{t.label}</span>
              {badge[t.id] > 0 && (
                <span className={`tw-nav__badge ${t.id === 'feedback' ? 'tw-nav__badge--alert' : ''}`}>{badge[t.id]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="tw-side__foot">
          <span className="tw-side__who">Signed in as <b>{user?.name}</b></span>
          <Button variant="ghost" size="sm" to="/dashboard">Back to dashboard</Button>
        </div>
      </aside>

      <main className="tw-main">
        <header className="tw-top">
          <div>
            <h1 className="tw-top__title">{current.label}</h1>
            <p className="tw-top__sub">{current.sub}</p>
          </div>
          <div className="tw-top__status">
            <span className={`tw-live ${error ? 'tw-live--down' : ''}`}>{error ? 'Connection problem' : 'Connected'}</span>
            <span className="tw-clock">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </header>

        {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-5)' }} role="alert">{error}</div>}

        <div className="tw-body route-in" key={tab}>
          {tab === 'overview' && <Overview stats={stats} topMatches={topMatches} topSaved={topSaved} fb={fb} signups={signups} onOpen={setTab} />}
          {tab === 'careers' && <CareersPanel onError={setError} />}
          {tab === 'quiz' && <QuizPanel onError={setError} />}
          {tab === 'media' && <MediaPanel onError={setError} />}
          {tab === 'feedback' && <FeedbackPanel onError={setError} />}
          {tab === 'stories' && <StoriesPanel onError={setError} />}
          {tab === 'users' && <UsersPanel onError={setError} currentUserId={user?.id} />}
        </div>
      </main>
    </div>
  );
}
