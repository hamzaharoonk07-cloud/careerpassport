import { useEffect, useRef } from 'react';
import { Button } from '../primitives/Button.jsx';

/**
 * Shared furniture for the admin panels.
 *
 * Deliberately plain. This is the back office — it should be fast to read
 * and fast to operate, not part of the airport fiction the rest of the site
 * is telling.
 */

/** A labelled input. `as` switches to a textarea or a select. */
export function Field({ label, as = 'input', hint, error, children, ...rest }) {
  const Tag = as;
  return (
    <label className="af">
      <span className="af__label">{label}</span>
      <Tag className={`af__input ${error ? 'af__input--bad' : ''}`} {...rest}>
        {children}
      </Tag>
      {error ? <span className="af__err">{error}</span> : hint ? <span className="af__hint">{hint}</span> : null}
    </label>
  );
}

/**
 * A modal that traps nothing and blocks nothing it does not need to.
 *
 * Escape closes it and focus moves to the first field on open — without
 * those two, a keyboard user is stranded behind the overlay.
 */
export function Modal({ title, onClose, onSubmit, submitLabel = 'Save', busy, wide, children }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    boxRef.current?.querySelector('input, textarea, select')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="amodal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="amodal__scrim" onClick={onClose} aria-label="Close" />
      <form
        ref={boxRef}
        className={`amodal__box ${wide ? 'amodal__box--wide' : ''}`}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      >
        <header className="amodal__head">
          <h3 className="amodal__title">{title}</h3>
          <button type="button" className="amodal__x" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="amodal__body">{children}</div>
        <footer className="amodal__foot">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={busy}>{submitLabel}</Button>
        </footer>
      </form>
    </div>
  );
}

/**
 * Destructive confirmation.
 *
 * Delete in this panel can mean "retire" instead, when stored results point
 * at the record — so the copy is supplied by the caller rather than assumed.
 */
export function Confirm({ title, body, onCancel, onConfirm, busy }) {
  return (
    <Modal title={title} onClose={onCancel} onSubmit={onConfirm} submitLabel="Delete" busy={busy}>
      <p className="af__hint" style={{ lineHeight: 1.6 }}>{body}</p>
    </Modal>
  );
}

/** Empty state that says what is missing and how to fix it. */
export function Empty({ children }) {
  return <p className="apanel__empty">{children}</p>;
}

/** A row of six 0–5 or 0–10 weight inputs. */
export function WeightRow({ label, keys, value = {}, max, onChange, hint }) {
  return (
    <div className="aweights">
      <span className="af__label">{label}</span>
      <div className="aweights__row">
        {keys.map((k) => (
          <label key={k} className="aweights__cell">
            <span>{k}</span>
            <input
              type="number"
              min="0"
              max={max}
              value={value[k] ?? 0}
              onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      {hint && <span className="af__hint">{hint}</span>}
    </div>
  );
}
