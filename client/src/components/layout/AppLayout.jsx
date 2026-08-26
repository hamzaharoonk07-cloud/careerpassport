import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { A11yControls } from './A11yControls.jsx';
import { Breadcrumbs } from './Breadcrumbs.jsx';
import { Logo } from '../brand/Logo.jsx';
import { Button } from '../primitives/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/app.css';

/**
 * The modules, as tabs.
 *
 * Everything in the architecture that a visitor can reach. Only three were
 * listed before and two of those were behind a session, so a logged-out
 * visitor saw a single link and no way through the site.
 *
 * `auth` hides a tab that would only bounce someone to the sign-in page.
 */
const LINKS = [
  { to: '/careers', label: 'Career Bank', auth: false },
  { to: '/dashboard', label: 'Dashboard', auth: true },
  { to: '/quiz', label: 'Quiz', auth: true },
  { to: '/roadmap', label: 'Roadmap', auth: true },
  { to: '/briefcase', label: 'Briefcase', auth: true },
  { to: '/feedback', label: 'Feedback', auth: false },
];

/**
 * The shell for the non-cinematic half of the product.
 *
 * The journey pages deliberately do not use this — they are full-bleed by
 * design. Everything a user returns to (dashboard, career bank, profile)
 * lives inside it.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const { user, isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const visible = LINKS.filter((l) => !l.auth || isAuthed);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>

      <header className="nav">
        <div className="wrap nav__inner">
          {/* Mark, name, and what the product is. A wordmark alone leaves a
              first-time visitor guessing; the descender line says it once
              and stops. */}
          <Link to="/" className="nav__brand" aria-label="PathSeeker — home">
            <Logo size={34} />
            <span className="nav__brand-text">
              <span className="nav__brand-name">PathSeeker</span>
              <span className="nav__brand-sub">Career Passport</span>
            </span>
          </Link>

          <nav className="nav__links" aria-label="Main">
            {visible.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `nav__link ${isActive ? 'nav__link--on' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}

            {isAuthed ? (
              <>
                <Link to="/account" className="nav__pass" title="Open your account">
                  {user.passportNumber}
                </Link>
                {user.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `nav__link ${isActive ? 'nav__link--on' : ''}`}
                  >
                    Admin
                  </NavLink>
                )}
                <Button variant="ghost" size="sm" onClick={signOut}>Log out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" to="/login">Sign in</Button>
                <Button size="sm" to="/register">Get a passport</Button>
              </>
            )}
            <A11yControls />
          </nav>
        </div>
      </header>

      {/* Breadcrumbs sit outside <main> so the trail is not read as part of
          the page content, and are hidden on the landing page where there is
          nowhere to have come from. */}
      {pathname !== '/' && (
        <div className="wrap app-crumbs">
          <Breadcrumbs />
        </div>
      )}

      <main id="main" className="app-main">
        <Outlet />
      </main>

      {/* Thumb-reachable navigation on small screens */}
      <nav className="tabbar" aria-label="Main">
        {visible.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `tabbar__link ${isActive ? 'tabbar__link--on' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
        {isAuthed ? (
          <button type="button" className="tabbar__link" onClick={signOut}>Log out</button>
        ) : (
          <NavLink to="/login" className="tabbar__link">Sign in</NavLink>
        )}
      </nav>
    </>
  );
}
