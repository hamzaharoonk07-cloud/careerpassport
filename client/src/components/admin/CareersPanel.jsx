import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button.jsx';
import { Field, Modal, Confirm, Empty, WeightRow } from './ui.jsx';
import { adminService } from '../../services/admin.service.js';
import { careerService } from '../../services/career.service.js';
import { apiError } from '../../services/api.js';

const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];

const EMPTY = {
  title: '', slug: '', field: '', summary: '', description: '', dayInLife: '',
  riasec: { R: 5, I: 5, A: 5, S: 5, E: 5, C: 5 },
  learningAreas: [],
  salary: { entry: null, mid: null, senior: null, currency: 'PKR', period: 'month', source: '' },
  demand: { level: null, note: '' },
  active: true,
};

/** Numbers the admin leaves blank must stay null, not become 0. */
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export function CareersPanel({ onError }) {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = (search = q) => adminService.careers({ q: search || undefined, limit: 100 })
    .then((d) => setRows(d.careers))
    .catch((e) => onError(apiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => {
    load();
    careerService.listFields().then(setFields).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...editing,
        salary: {
          ...editing.salary,
          entry: numOrNull(editing.salary.entry),
          mid: numOrNull(editing.salary.mid),
          senior: numOrNull(editing.salary.senior),
        },
      };
      if (editing._id) await adminService.updateCareer(editing._id, body);
      else await adminService.createCareer(body);
      setEditing(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await adminService.deleteCareer(removing._id);
      // The server retires rather than deletes when stored results point at
      // the career, and says which it did. Repeat that back verbatim.
      setNotice(res.message);
      setRemoving(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Career profiles</h2>
          <p className="apanel__sub">
            The destinations behind the departures board. Editing the RIASEC weights changes how everyone is matched.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY, field: fields[0]?._id || '' })}>Add career</Button>
      </header>

      {notice && <p className="anotice" role="status">{notice}</p>}

      <input
        className="af__input apanel__search"
        type="search"
        placeholder="Search careers…"
        value={q}
        onChange={(e) => { setQ(e.target.value); load(e.target.value); }}
        aria-label="Search careers"
      />

      {loading ? <Empty>Loading…</Empty> : rows.length === 0 ? (
        <Empty>No careers match that search.</Empty>
      ) : (
        <div className="atable">
          <div className="atable__head atable__row--career"><span>Title</span><span>Field</span><span>RIASEC</span><span>Salary</span><span>Status</span><span /></div>
          {rows.map((c) => (
            <div className="atable__row atable__row--career" key={c._id}>
              <span className="atable__strong">{c.title}</span>
              <span className="atable__dim">{c.field?.name || '—'}</span>
              <span className="atable__mono">{AXES.map((a) => c.riasec?.[a] ?? 0).join(' ')}</span>
              <span className="atable__dim">{c.salary?.entry != null ? `${c.salary.currency} ${c.salary.entry}` : 'not available'}</span>
              <span className={c.active ? 'atag atag--on' : 'atag'}>{c.active ? 'live' : 'retired'}</span>
              <span className="atable__acts">
                <button type="button" className="alink" onClick={() => setEditing({ ...c, field: c.field?._id || c.field })}>Edit</button>
                <button type="button" className="alink alink--bad" onClick={() => setRemoving(c)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing._id ? `Edit ${editing.title}` : 'Add career'}
          onClose={() => setEditing(null)}
          onSubmit={save}
          busy={busy}
          wide
        >
          <Field label="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
          <Field label="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} hint="Leave blank to generate from the title." />
          <Field label="Field" as="select" value={editing.field} onChange={(e) => setEditing({ ...editing, field: e.target.value })} required>
            <option value="">Choose a field…</option>
            {fields.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </Field>
          <Field label="Summary" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} required hint="One line, up to 180 characters." />
          <Field label="Description" as="textarea" rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} required />

          <WeightRow
            label="RIASEC profile"
            keys={AXES}
            max={10}
            value={editing.riasec}
            onChange={(riasec) => setEditing({ ...editing, riasec })}
            hint="0–10 per axis. This is what the engine measures a traveller against, so changing it re-matches everyone from here on."
          />

          <div className="agrid3">
            <Field label="Entry salary" type="number" value={editing.salary.entry ?? ''} onChange={(e) => setEditing({ ...editing, salary: { ...editing.salary, entry: e.target.value } })} />
            <Field label="Mid" type="number" value={editing.salary.mid ?? ''} onChange={(e) => setEditing({ ...editing, salary: { ...editing.salary, mid: e.target.value } })} />
            <Field label="Senior" type="number" value={editing.salary.senior ?? ''} onChange={(e) => setEditing({ ...editing, salary: { ...editing.salary, senior: e.target.value } })} />
          </div>
          <p className="af__hint">
            Leave salary blank where you do not have a real figure. The site prints “Information not available” rather than inventing one.
          </p>

          <Field label="Salary source" value={editing.salary.source} onChange={(e) => setEditing({ ...editing, salary: { ...editing.salary, source: e.target.value } })} hint="Where the figure came from." />

          <label className="acheck">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span>Live — appears on the departures board</span>
          </label>
        </Modal>
      )}

      {removing && (
        <Confirm
          title={`Delete ${removing.title}`}
          body="If any traveller's stored result already matched this career, it will be retired instead of deleted — their result has to keep meaning something. The panel will tell you which happened."
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}
