import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { A11yProvider } from './context/A11yContext.jsx';
import { JourneyProvider } from './context/JourneyContext.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';

import Intro from './pages/Intro.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Route-level code splitting.
 *
 * A visitor who only browses the career bank never downloads the quiz engine,
 * the briefcase, or the dashboard. Only the landing page is in the main bundle.
 */
const PassportAuth = lazy(() => import('./pages/PassportAuth.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const PassportPage = lazy(() => import('./pages/PassportPage.jsx'));
const Airport = lazy(() => import('./pages/Airport.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const Analysis = lazy(() => import('./pages/Analysis.jsx'));
const Result = lazy(() => import('./pages/Result.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const Briefcase = lazy(() => import('./pages/Briefcase.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Careers = lazy(() => import('./pages/Careers.jsx'));
const CareerDetail = lazy(() => import('./pages/CareerDetail.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Media = lazy(() => import('./pages/Media.jsx'));
const Stories = lazy(() => import('./pages/Stories.jsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));

function Loading() {
  return (
    <div className="center-screen">
      <p className="t-low">Loading…</p>
    </div>
  );
}

/** Resets scroll on navigation — a single-page app does not do this for you. */
function ScrollReset() {
  const { pathname } = useLocation();
  // In an effect, not the render body: scrolling is a side effect, and React
  // runs render twice in development.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  return (
    <A11yProvider>
      <AuthProvider>
      <JourneyProvider>
        <a className="skip-link" href="#main">Skip to content</a>
        <ScrollReset />
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ── The cinematic journey — full-bleed, no chrome ── */}
            <Route path="/" element={<Intro />} />
            {/* The passport IS the auth interface. Both paths render the same
                component; /login and /register only pick its opening mode, and
                the old URLs keep working. */}
            <Route path="/login" element={<PassportAuth />} />
            <Route path="/register" element={<PassportAuth />} />
            <Route path="/passport/:mode" element={<PassportAuth />} />

            <Route path="/passport" element={guard(<PassportPage />)} />

            {/* The airport terminal is the destination-choosing screen.
                Every earlier URL for that step redirects here, so nothing
                that linked to them breaks. */}
            <Route path="/airport" element={guard(<Airport />)} />
            <Route path="/journey" element={<Navigate to="/airport" replace />} />
            <Route path="/station" element={<Navigate to="/airport" replace />} />
            <Route path="/train" element={<Navigate to="/airport" replace />} />
            <Route path="/quiz" element={guard(<Quiz />)} />
            <Route path="/analysis" element={guard(<Analysis />)} />
            <Route path="/briefcase" element={guard(<Briefcase />)} />

            {/* ── The product — inside the app shell ── */}
            <Route element={<AppLayout />}>
              <Route path="/result" element={guard(<Result />)} />
              <Route path="/roadmap" element={guard(<Roadmap />)} />
              <Route path="/dashboard" element={guard(<Dashboard />)} />
              <Route path="/careers" element={<Careers />} />
              {/* Public: readable and submittable without an account. */}
              <Route path="/media" element={<Media />} />
              <Route path="/stories" element={<Stories />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/careers/:id" element={<CareerDetail />} />
              <Route path="/account" element={guard(<Account />)} />
              {/* The API enforces the admin role; this route only hides the page. */}
              <Route path="/admin" element={guard(<Admin />)} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </JourneyProvider>
    </AuthProvider>
    </A11yProvider>
  );
}
