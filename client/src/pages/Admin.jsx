import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { api, apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/admin.css';

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const STAT_LABELS = {
  users: 'Travellers',
  admins: 'Administrators',
  results: 'Quizzes taken',
  saved: 'Careers saved',
  careers: 'Destinations',
  fields: 'Route groups',
  answers: 'Answers recorded',
};

/**
 * Admin panel.
 *
 * Every request here goes to /api/admin/*, which requires both a session and
 * the admin role server-side. This page hides itself from non-admins as a
 * courtesy — the API is what actually refuses them.
 */
export default function Admin() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async (opts = {}) => {
    try {
      const { data } = await api.get('/admin/users', {
        params: { q: opts.q ?? q, page: opts.page ?? page, limit: 20 },
      });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(apiError(err));
    }
  }, [q, page]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.get('/admin/stats'), api.get('/admin/users', { params: { limit: 20 } })])
      .then(([s, u]) => {
        if (!alive) return;
        if (s.status === 'fulfilled') {
          setStats(s.value.data.stats);
          setTopMatches(s.value.data.topMatches || []);
        } else setError(apiError(s.reason));
        if (u.status === 'fulfilled') {
          setUsers(u.value.data.users);
          setTotal(u.value.data.total);
          setPages(u.value.data.pages);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const open = async (id) => {
    setDetail({ loading: true });
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(apiError(err));
    }
  };

  const toggleRole = async (u) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/admin/users/${u._id}/role`, { role: next });
      await loadUsers();
      if (detail?.user?._id === u._id) open(u._id);
    } catch (err) {
      setError(apiError(err));
    }
  };

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
          <p className="t-eyebrow">Administration · Career Passport</p>
          <h1 className="t-h2 page__title">Control tower</h1>
        </div>
        <Button variant="ghost" to="/dashboard">Back to dashboard</Button>
      </header>

      {loading && <p className="t-low" style={{ marginTop: 'var(--sp-6)' }}>Loading…</p>}
      {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-5)' }} role="alert">{error}</div>}

      {stats && (
        <div className="adm__stats">
          {Object.entries(stats).map(([k, v]) => (
            <div className="adm__stat" key={k}>
              <div className="adm__stat-n">{v}</div>
              <div className="adm__stat-k">{STAT_LABELS[k] || k}</div>
            </div>
          ))}
        </div>
      )}

      {topMatches.length > 0 && (
        <section className="panel" style={{ marginTop: 'var(--sp-5)' }}>
          <h2 className="panel__h">Most common destinations</h2>
          <ul className="adm__list">
            {topMatches.map((m) => (
              <li key={m.slug}>
                <b>{m.title}</b>
                <span className="t-mono">{m.count} traveller{m.count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="adm__bar">
        <input
          className="field__input"
          type="search"
          placeholder="Search name, email or passport…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); loadUsers({ q: e.target.value, page: 1 }); }}
          aria-label="Search users"
        />
        <span className="t-low" style={{ fontSize: 'var(--fs-sm)' }}>{total} user{total === 1 ? '' : 's'}</span>
      </div>

      <div className="adm__table">
        <div className="adm__head">
          <span>Passport</span><span>Name</span><span>Email</span><span>Stage</span><span>Role</span><span>Joined</span>
        </div>
        {users.map((u) => (
          <button type="button" className="adm__row" key={u._id} onClick={() => open(u._id)}>
            <span className="adm__pass">{u.passportNumber}</span>
            <span className="adm__name">{u.name}</span>
            <span className="adm__email">{u.email}</span>
            <span className="adm__stage">{u.journeyStage?.replace('-', ' ')}</span>
            <span className={`adm__role ${u.role === 'admin' ? 'adm__role--admin' : ''}`}>{u.role}</span>
            <span className="adm__stage">{fmtDate(u.createdAt)}</span>
          </button>
        ))}
        {!users.length && !loading && (
          <p className="t-low" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>No users match that search.</p>
        )}
      </div>

      {pages > 1 && (
        <div className="bank__pager">
          <Button variant="ghost" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); loadUsers({ page: p }); }}>← Previous</Button>
          <span className="bank__pager-n">Page {page} of {pages}</span>
          <Button variant="ghost" disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); loadUsers({ page: p }); }}>Next →</Button>
        </div>
      )}

      {detail && (
        <section className="adm__detail">
          {detail.loading ? (
            <p className="t-low">Loading user…</p>
          ) : (
            <>
              <div className="adm__detail-head">
                <div>
                  <p className="t-eyebrow">{detail.user.passportNumber}</p>
                  <h2 className="t-h3" style={{ marginTop: 'var(--sp-2)' }}>{detail.user.name}</h2>
                  <p className="adm__email" style={{ marginTop: 'var(--sp-2)' }}>{detail.user.email}</p>
                </div>
                <div className="row" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant={detail.user.role === 'admin' ? 'danger' : 'secondary'}
                    onClick={() => toggleRole(detail.user)}
                    disabled={String(detail.user._id) === String(user?.id)}
                  >
                    {detail.user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Close</Button>
                </div>
              </div>

              <div className="acct__facts" style={{ marginTop: 'var(--sp-5)' }}>
                <div><dt className="adm__stat-k">Education</dt><dd className="adm__name">{detail.user.profile?.education || '—'}</dd></div>
                <div><dt className="adm__stat-k">Age</dt><dd className="adm__name">{detail.user.profile?.age ?? '—'}</dd></div>
                <div><dt className="adm__stat-k">Location</dt><dd className="adm__name">{detail.user.profile?.location || '—'}</dd></div>
                <div><dt className="adm__stat-k">Last login</dt><dd className="adm__name">{fmtDate(detail.user.lastLoginAt)}</dd></div>
              </div>

              <div className="adm__sub">
                <p className="t-eyebrow">Quiz results ({detail.results.length})</p>
                {detail.results.length ? (
                  <ul className="adm__list">
                    {detail.results.map((r) => (
                      <li key={r._id}>
                        <b>{r.matches?.[0]?.career?.title || 'No match'}</b>
                        <span className="t-mono">
                          {r.matches?.[0]?.score ?? '—'}% · {(r.dominantAxes || []).join('/')} · {fmtDate(r.takenAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="t-low" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)' }}>Has not taken the quiz.</p>}
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
                ) : <p className="t-low" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)' }}>Nothing saved.</p>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
