import { Button } from '../components/primitives/Button.jsx';

export default function NotFound() {
  return (
    <main className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
      <div>
        <p className="t-eyebrow">404 · No such destination</p>
        <h1 className="t-hero" style={{ marginTop: 'var(--sp-4)' }}>Off the map</h1>
        <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
          There is no page at this address. Every route worth taking starts at the passport.
        </p>
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <Button to="/">Return to PathSeeker</Button>
        </div>
      </div>
    </main>
  );
}
