import { Link, useLocation } from 'react-router-dom';

/**
 * Breadcrumbs, derived from the URL.
 *
 * Built from the path rather than declared per page, so a trail can never
 * disagree with where the visitor actually is — the usual failure mode for
 * hand-written breadcrumbs.
 *
 * Named in the language of the site: /careers is the departures board, not
 * "careers", because that is what every link to it says.
 */
const LABELS = {
  careers: 'Departures',
  dashboard: 'Dashboard',
  airport: 'Terminal',
  quiz: 'Quiz',
  result: 'Result',
  roadmap: 'Flight plan',
  account: 'Account',
  admin: 'Control tower',
  login: 'Sign in',
  register: 'Register',
};

/** Slugs become Title Case when we have no better name for them. */
const pretty = (seg) =>
  LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function Breadcrumbs({ trailingLabel }) {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  // The home crumb alone is noise; a trail needs somewhere to have come from.
  if (segments.length === 0) return null;

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/" className="crumbs__link">Home</Link>
      {segments.map((seg, i) => {
        const to = `/${segments.slice(0, i + 1).join('/')}`;
        const last = i === segments.length - 1;
        // A detail page knows its own title; the slug in the URL is not it.
        const label = last && trailingLabel ? trailingLabel : pretty(seg);
        return (
          <span key={to} className="crumbs" style={{ gap: 6 }}>
            <span className="crumbs__sep" aria-hidden="true">/</span>
            {last ? (
              <span className="crumbs__now" aria-current="page">{label}</span>
            ) : (
              <Link to={to} className="crumbs__link">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
