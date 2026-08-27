import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FlightLoader, useLanding } from '../brand/FlightLoader.jsx';

/**
 * Gates the journey behind a session.
 *
 * Remembers where the user was headed so signing in returns them there
 * rather than dumping them on the passport page.
 */
export function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  // Hold the loader until its climb resolves, then show the page.
  const { held, landing } = useLanding(loading);
  if (held) {
    return (
      <div className="center-screen">
        <FlightLoader label="Checking your passport" {...landing} />
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
