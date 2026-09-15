import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { careerService } from '../services/career.service.js';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed.js';
import { apiError } from '../services/api.js';
import { FieldIcon } from '../components/brand/FieldIcon.jsx';
import { DemandMeter, salaryBand } from '../components/brand/DepartureBoard.jsx';
import '../styles/bank.css';

/** Debounces a value so typing in the search box does not fire a request per keystroke. */
function useDebounced(value, ms = 320) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return out;
}

/**
 * The departures hall — every destination in the bank.
 *
 * Search, field filter and skill filter all run server-side against MongoDB —
 * the client never holds the full list, so this stays fast as the bank grows.
 * Filter state lives in the URL, so a filtered view is shareable.
 */
export default function Careers() {
  const [params, setParams] = useSearchParams();

  const [fields, setFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [data, setData] = useState({ careers: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { recent, clear } = useRecentlyViewed();
  const [counts, setCounts] = useState({});
  const [bankTotal, setBankTotal] = useState(0);
  const searchRef = useRef(null);

  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounced(q);

  const field = params.get('field') || '';
  const skill = params.get('skill') || '';
  const page = Number(params.get('page') || 1);

  // Load the filter vocabularies once.
  // The per-field counts come from one pass over the whole bank, so each tab
  // can say how many destinations it holds before it is opened.
  useEffect(() => {
    Promise.allSettled([
      careerService.listFields(),
      careerService.skills(),
      careerService.list({ limit: 60 }),
    ]).then(([f, s, all]) => {
      if (f.status === 'fulfilled') setFields(f.value);
      if (s.status === 'fulfilled') setSkills(s.value);
      if (all.status === 'fulfilled') {
        const c = {};
        for (const career of all.value.careers || []) {
          const slug = career.field?.slug;
          if (slug) c[slug] = (c[slug] || 0) + 1;
        }
        setCounts(c);
        setBankTotal(all.value.total || 0);
      }
    });
  }, []);

  // "/" jumps to search, the way it does on most catalogues.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.target.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the URL in step with the search box.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedQ) next.set('q', debouncedQ); else next.delete('q');
    if (debouncedQ !== (params.get('q') || '')) {
      next.delete('page');
      setParams(next, { replace: true });
    }
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setLoading(true);
    careerService
      .list({ q: debouncedQ || undefined, field: field || undefined, skill: skill || undefined, page, limit: 12 })
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [debouncedQ, field, skill, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const active = useMemo(() => Boolean(q || field || skill), [q, field, skill]);

  const clearAll = () => { setQ(''); setParams(new URLSearchParams()); };
  const fieldName = fields.find((f) => f.slug === field)?.name;

  return (
    <div className="page wrap bank">
      <header className="bank__hero">
        <div>
          <h1 className="bank__title">Career Bank</h1>
          {/* The counts are read from the database rather than written into the
              copy, which is the kind of number that otherwise goes stale. */}
          <p className="bank__lead">
            {bankTotal ? `${bankTotal} careers` : 'Every career'} across {fields.length || 'six'} fields:
            what the work is, what it pays, the skills it asks for and a six-stage route in.
          </p>
          <p className="bank__fork">
            Not sure where to start? <Link to="/interests" className="bank__fork-link">Choose a field or answer 7 questions</Link>
          </p>
        </div>

        <label className="bank__search">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search a career, a skill, a subject…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search careers"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
      </header>

      <div className="bank__tabs" role="group" aria-label="Filter by field">
        <button type="button" className="bank__tab" aria-pressed={!field} onClick={() => setParam('field', '')}>
          All fields <span className="bank__tab-n">{bankTotal || '—'}</span>
        </button>
        {fields.map((f) => (
          <button
            key={f.slug}
            type="button"
            className="bank__tab"
            aria-pressed={field === f.slug}
            onClick={() => setParam('field', f.slug)}
            style={{ '--accent': f.accent }}
          >
            <FieldIcon name={f.icon} size={17} />
            {f.name}
            <span className="bank__tab-n">{counts[f.slug] ?? '—'}</span>
          </button>
        ))}
      </div>

      <div className="bank__bar">
        <div className="bank__status" aria-live="polite">
          <b>{loading ? '…' : data.total}</b> {data.total === 1 ? 'career' : 'careers'}
          {active && !loading && (
            <span className="bank__pills">
              {q && <button type="button" className="bank__pill" onClick={() => setQ('')}>“{q}” <span aria-hidden="true">×</span></button>}
              {field && <button type="button" className="bank__pill" onClick={() => setParam('field', '')}>{fieldName} <span aria-hidden="true">×</span></button>}
              {skill && <button type="button" className="bank__pill" onClick={() => setParam('skill', '')}>{skill} <span aria-hidden="true">×</span></button>}
              <button type="button" className="bank__clear" onClick={clearAll}>Clear all</button>
            </span>
          )}
        </div>
        <label className="bank__skill">
          <span>Skill</span>
          <select value={skill} onChange={(e) => setParam('skill', e.target.value)} aria-label="Filter by skill">
            <option value="">Any skill</option>
            {skills.map((sk) => <option key={sk} value={sk}>{sk}</option>)}
          </select>
        </label>
      </div>

      {/* Kept on the device, not the server: browsing history is worth not
          collecting when a bit of localStorage does the job. */}
      {recent.length > 0 && (
        <section className="bank__recent">
          <span className="bank__recent-k">Recently viewed</span>
          <div className="bank__recent-row">
            {recent.map((r) => (
              <Link key={r.slug} to={`/careers/${r.slug}`} className="bank__recent-chip">
                {r.title}{r.field && <small>{r.field}</small>}
              </Link>
            ))}
          </div>
          <button type="button" className="bank__clear" onClick={clear}>Clear</button>
        </section>
      )}

      {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-4)' }} role="alert">{error}</div>}

      {!loading && data.careers.length === 0 ? (
        <div className="bank__empty">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8.5 11h5" />
          </svg>
          <h2>No careers match that</h2>
          <p>Try a broader word, another field, or clear the filters to see the whole bank.</p>
          <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
        </div>
      ) : (
        <div className={`bank__grid ${loading ? 'is-loading' : ''}`}>
          {data.careers.map((c) => {
            const pay = salaryBand(c.salary);
            return (
              <Link to={`/careers/${c.slug}`} className="bcard" key={c._id} style={{ '--accent': c.field?.accent || 'var(--gold-500)' }}>
                <span className="bcard__band">
                  <span className="bcard__field"><FieldIcon name={c.field?.icon} size={15} />{c.field?.name}</span>
                </span>
                <span className="bcard__body">
                  <span className="bcard__title">{c.title}</span>
                  <span className="bcard__sum">{c.summary}</span>
                  {c.skills?.length > 0 && (
                    <span className="bcard__skills">
                      {c.skills.slice(0, 3).map((sk) => <span key={sk.name}>{sk.name}</span>)}
                    </span>
                  )}
                  <span className="bcard__facts">
                    <span className="bcard__fact">
                      <small>Demand</small>
                      <DemandMeter level={c.demand?.level} />
                    </span>
                    <span className="bcard__fact">
                      <small>Salary / month</small>
                      <b className={pay ? '' : 'is-none'}>{pay || 'Not available'}</b>
                    </span>
                  </span>
                </span>
                <span className="bcard__foot">
                  View route
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {data.pages > 1 && (
        <nav className="bank__pager" aria-label="Pages">
          <button type="button" className="bank__page" onClick={() => setParam('page', String(page - 1))} disabled={page <= 1} aria-label="Previous page">‹</button>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="bank__page"
              aria-current={n === data.page ? 'page' : undefined}
              onClick={() => setParam('page', String(n))}
            >
              {n}
            </button>
          ))}
          <button type="button" className="bank__page" onClick={() => setParam('page', String(page + 1))} disabled={page >= data.pages} aria-label="Next page">›</button>
        </nav>
      )}
    </div>
  );
}
