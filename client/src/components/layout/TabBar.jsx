import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/app.css';

/**
 * The modules, as tabs.
 *
 * Everything in the architecture that a visitor can reach. `auth` hides a tab
 * that would only bounce someone to the sign-in page.
 */
export const LINKS = [
  // The terminal is the hub of the journey. Someone who left mid-journey and
  // came back had no way to return to it, and someone who had already flown
  // had no way to look at where they landed.
  { to: '/airport', label: 'Terminal', auth: true },
  { to: '/careers', label: 'Career Bank', auth: false },
  { to: '/media', label: 'Multimedia', auth: false },
  { to: '/stories', label: 'Stories', auth: false },
  { to: '/dashboard', label: 'Dashboard', auth: true },
  { to: '/roadmap', label: 'Roadmap', auth: true },
  { to: '/feedback', label: 'Feedback', auth: false },
];

/**
 * Thumb-reachable navigation for small screens.
 *
 * Lifted out of AppLayout because the journey pages are deliberately outside
 * that shell — they are full-bleed, with no top nav by design — and the
 * consequence on a phone was that /airport, /quiz and /analysis had no
 * navigation of any kind. On a desktop those pages still have the rest of the
 * window and a back link; on a phone the visitor was simply stuck there.
 *
 * The bar hides itself above 1024px, so rendering it on a cinematic page
 * costs that page nothing on a desktop.
 */
export function TabBar({ underNav = false }) {
  const { pathname } = useLocation();
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);

  const visible = LINKS.filter((l) => !l.auth || isAuthed);

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  /* Signed in, the bar holds eight destinations — more than a phone can show
     at a legible size, so it scrolls sideways. That leaves the tab you are
     actually on able to sit off-screen, which is the one thing a tab bar must
     never do. Bring it back into view whenever the route changes. */
  useEffect(() => {
    const on = ref.current?.querySelector('.tabbar__link--on');
    on?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [pathname]);

  return (
    <nav className={`tabbar ${underNav ? 'tabbar--under-nav' : ''}`} aria-label="Main" ref={ref}>
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
  );
}
