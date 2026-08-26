import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { AskBox } from '../components/brand/AskBox.jsx';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { formatSalary } from './Result.jsx';

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

  const [q, setQ] = useState(params.get('q') || '');
  const debouncedQ = useDebounced(q);

  const field = params.get('field') || '';
  const skill = params.get('skill') || '';
  const page = Number(params.get('page') || 1);

  // Load the filter vocabularies once.
  useEffect(() => {
    Promise.allSettled([careerService.listFields(), careerService.skills()]).then(([f, s]) => {
      if (f.status === 'fulfilled') setFields(f.value);
      if (s.status === 'fulfilled') setSkills(s.value);
    });
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

  return (
    <div className="page wrap">
      <header className="page__head">
        <div>
          {/* Keeps the SRS name visible — the architecture calls this module
              the Career Bank, and it should be findable by that name — while
              the departures framing carries the airport metaphor. */}
          <p className="t-eyebrow">Career Bank · Departures · Karachi</p>
          <h1 className="t-h2 page__title">Every destination on the board</h1>
          {/* The count is read from the database rather than written into the
              copy. It said "thirty-six" here while the bank held thirty-eight,
              which is exactly the kind of number that goes stale silently. */}
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            {data.total ? `${data.total} destinations` : 'Every destination'} across{' '}
            {fields.length || 'six'} route groups — the skills each one needs, what to learn
            first, and a six-stage route in.
          </p>
          <p className="bank__fork">
            Know what you are looking for? Search the board below.{' '}
            <Link to="/register" className="bank__fork-link">Not sure? Take the passport quiz →</Link>
          </p>
        </div>
      </header>

      {/* For the person who will not sit through ten questions, or who
          already knows something about themselves and wants to start there. */}
      <AskBox />

      <div className="bank__filters">
        <input
          type="search"
          className="field__input"
          placeholder="Search title, summary or skill…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search careers"
        />
        <select className="select" value={field} onChange={(e) => setParam('field', e.target.value)} aria-label="Filter by field">
          <option value="">All fields</option>
          {fields.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
        </select>
        <select className="select" value={skill} onChange={(e) => setParam('skill', e.target.value)} aria-label="Filter by skill">
          <option value="">All skills</option>
          {skills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <p className="bank__count" aria-live="polite">
        {loading ? 'Searching…' : `${data.total} career${data.total === 1 ? '' : 's'}`}
        {active && !loading && (
          <>
            {' · '}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ padding: 0, minHeight: 'auto' }}
              onClick={() => { setQ(''); setParams(new URLSearchParams()); }}
            >
              Clear filters
            </button>
          </>
        )}
      </p>

      {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-4)' }} role="alert">{error}</div>}

      {!loading && data.careers.length === 0 && (
        <div className="bank__empty">
          <p>Nothing matches those filters.</p>
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <Button variant="secondary" onClick={() => { setQ(''); setParams(new URLSearchParams()); }}>
              Clear filters
            </Button>
          </div>
        </div>
      )}

      <div className="bank__grid">
        {data.careers.map((c) => (
          <Link to={`/careers/${c.slug}`} className="ccard" key={c._id}>
            <div className="ccard__top">
              <span className="ccard__field">{c.field?.name}</span>
            </div>
            <span className="ccard__title">{c.title}</span>
            <p className="ccard__sum">{c.summary}</p>
            <div className="ccard__foot">
              <span className={`tag ${c.hasSalaryData ? 'tag--gold' : ''}`}>
                {formatSalary(c.salary) || 'Salary not available'}
              </span>
              {c.demand?.level && <span className="tag">{c.demand.level.replace('-', ' ')} demand</span>}
            </div>
          </Link>
        ))}
      </div>

      {data.pages > 1 && (
        <div className="bank__pager">
          <Button variant="ghost" onClick={() => setParam('page', String(page - 1))} disabled={page <= 1}>
            ← Previous
          </Button>
          <span className="bank__pager-n">Page {data.page} of {data.pages}</span>
          <Button variant="ghost" onClick={() => setParam('page', String(page + 1))} disabled={page >= data.pages}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
