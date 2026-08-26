import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { CareersPanel } from '../components/admin/CareersPanel.jsx';
import { QuizPanel } from '../components/admin/QuizPanel.jsx';
import { MediaPanel, FeedbackPanel, StoriesPanel } from '../components/admin/ContentPanels.jsx';
import { Empty } from '../components/admin/ui.jsx';
import { adminService } from '../services/admin.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/admin.css';
import '../styles/admin-panels.css';

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
  { id: 'overview', label: 'Overview' },
  { id: 'careers', label: 'Careers' },
  { id: 'quiz', label: 'Quiz & scoring' },
  { id: 'media', label: 'Multimedia' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'stories', label: 'Success stories' },
  { id: 'users', label: 'Users' },
];

/* ── Overview ───────────────────────────────────────────────── */

function Overview({ stats, topMatches, topSaved }) {
  if (!stats) return <Empty>Loading…</Empty>;
  return (
    <section className="apanel">
      <div className="adm__stats">
        {Object.entries(stats).map(([k, v]) => (
          <div className="adm__stat" key={k}>
            <div className="adm__stat-n">{v}</div>
            <div className="adm__stat-k">{STAT_LABELS[k] || k}</div>
          </div>
        ))}
      </div>

      <div className="agrid2">
        <div className="apanel__box">
          <h3 className="apanel__title">Most matched</h3>
          <p className="apanel__sub">Where the engine sends people.</p>
          {topMatches.length ? (
            <ul className="adm__list">
              {topMatches.map((m) => (
                <li key={m.slug}><b>{m.title}</b><span className="t-mono">{m.count}</span></li>
              ))}
            </ul>
          ) : <Empty>No quiz results yet.</Empty>}
        </div>

        <div className="apanel__box">
          <h3 className="apanel__title">Most saved</h3>
          <p className="apanel__sub">What people bookmark — not always the same thing.</p>
          {topSaved.length ? (
            <ul className="adm__list">
              {topSaved.map((m) => (
                <li key={m.slug}><b>{m.title}</b><span className="t-mono">{m.count}</span></li>
              ))}
            </ul>
          ) : <Empty>Nothing saved yet.</Empty>}
        </div>
      </div>
    </section>
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

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Users</h2>
          <p className="apanel__sub">{total} registered.</p>
        </div>
      </header>

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
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.stats()
      .then((d) => { setStats(d.stats); setTopMatches(d.topMatches || []); setTopSaved(d.topSaved || []); })
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

  return (
    <div className="page wrap">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Administration · PathSeeker</p>
          <h1 className="t-h2 page__title">Control tower</h1>
        </div>
        <Button variant="ghost" to="/dashboard">Back to dashboard</Button>
      </header>

      {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-5)' }} role="alert">{error}</div>}

      <nav className="atabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`atab ${tab === t.id ? 'atab--on' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
            {t.id === 'feedback' && stats?.feedbackNew > 0 && <span className="atab__dot">{stats.feedbackNew}</span>}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview stats={stats} topMatches={topMatches} topSaved={topSaved} />}
      {tab === 'careers' && <CareersPanel onError={setError} />}
      {tab === 'quiz' && <QuizPanel onError={setError} />}
      {tab === 'media' && <MediaPanel onError={setError} />}
      {tab === 'feedback' && <FeedbackPanel onError={setError} />}
      {tab === 'stories' && <StoriesPanel onError={setError} />}
      {tab === 'users' && <UsersPanel onError={setError} currentUserId={user?.id} />}
    </div>
  );
}
