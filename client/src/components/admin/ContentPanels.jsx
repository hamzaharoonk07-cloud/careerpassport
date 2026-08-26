import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button.jsx';
import { Field, Modal, Confirm, Empty } from './ui.jsx';
import { adminService } from '../../services/admin.service.js';
import { apiError } from '../../services/api.js';

const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/* ══════════════════════════════════════════════════════════════
   Multimedia centre
   ══════════════════════════════════════════════════════════════ */

const EMPTY_MEDIA = { title: '', description: '', kind: 'video', url: '', thumbnailUrl: '', order: 0, active: true };

export function MediaPanel({ onError }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => adminService.media()
    .then((d) => setItems(d.media))
    .catch((e) => onError(apiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editing._id) await adminService.updateMedia(editing._id, editing);
      else await adminService.createMedia(editing);
      setEditing(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminService.deleteMedia(removing._id);
      setRemoving(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Multimedia content</h2>
          <p className="apanel__sub">Videos, images, documents and links. The file itself lives wherever it is hosted — this stores the pointer.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY_MEDIA })}>Add item</Button>
      </header>

      {loading ? <Empty>Loading…</Empty> : items.length === 0 ? (
        <Empty>Nothing in the multimedia centre yet. Add the first item.</Empty>
      ) : (
        <div className="atable">
          <div className="atable__head atable__row--media"><span>Title</span><span>Kind</span><span>URL</span><span>Status</span><span /></div>
          {items.map((m) => (
            <div className="atable__row atable__row--media" key={m._id}>
              <span className="atable__strong">{m.title}</span>
              <span className="atable__mono">{m.kind}</span>
              <span className="atable__dim atable__trunc">{m.url}</span>
              <span className={m.active ? 'atag atag--on' : 'atag'}>{m.active ? 'live' : 'hidden'}</span>
              <span className="atable__acts">
                <button type="button" className="alink" onClick={() => setEditing({ ...m })}>Edit</button>
                <button type="button" className="alink alink--bad" onClick={() => setRemoving(m)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing._id ? 'Edit media item' : 'Add media item'}
          onClose={() => setEditing(null)}
          onSubmit={save}
          busy={busy}
        >
          <Field label="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
          <Field label="Kind" as="select" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="document">Document</option>
            <option value="link">Link</option>
          </Field>
          <Field label="URL" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} required hint="A path like /videos/gate.mp4, or a full https:// address." />
          <Field label="Description" as="textarea" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <Field label="Order" type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} hint="Lower numbers appear first." />
          <label className="acheck">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span>Visible on the site</span>
          </label>
        </Modal>
      )}

      {removing && (
        <Confirm
          title="Delete media item"
          body={`"${removing.title}" will be removed permanently. This cannot be undone.`}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Feedback
   ══════════════════════════════════════════════════════════════ */

export function FeedbackPanel({ onError }) {
  const [items, setItems] = useState([]);
  const [replying, setReplying] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => adminService.feedback()
    .then((d) => setItems(d.feedback))
    .catch((e) => onError(apiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const setStatus = async (item, status) => {
    try {
      await adminService.updateFeedback(item._id, { status });
      setItems((prev) => prev.map((f) => (f._id === item._id ? { ...f, status } : f)));
    } catch (e) { onError(apiError(e)); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminService.deleteFeedback(removing._id);
      setRemoving(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const sendReply = async () => {
    setBusy(true);
    try {
      await adminService.updateFeedback(replying._id, { reply: replying.draft });
      setReplying(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">User feedback</h2>
          <p className="apanel__sub">What travellers said, newest first.</p>
        </div>
      </header>

      {loading ? <Empty>Loading…</Empty> : items.length === 0 ? (
        <Empty>No feedback yet. It will appear here as travellers leave it.</Empty>
      ) : (
        <div className="acards">
          {items.map((f) => (
            <article className="acard" key={f._id}>
              <div className="acard__top">
                <span className="acard__rating" aria-label={`${f.rating} out of 5`}>
                  {'★'.repeat(f.rating)}<span className="acard__rating-off">{'★'.repeat(5 - f.rating)}</span>
                </span>
                <span className={`atag ${f.status === 'new' ? 'atag--on' : ''}`}>{f.status}</span>
                <span className="atable__dim">{fmt(f.createdAt)}</span>
              </div>
              <p className="acard__body">{f.message}</p>

              {f.reply?.message && (
                <div className="acard__reply">
                  <span className="af__label">Your reply</span>
                  <p>{f.reply.message}</p>
                </div>
              )}
              <div className="acard__foot">
                <span className="atable__dim">
                  {f.user?.name || f.name || 'Anonymous'}
                  {f.user?.passportNumber ? ` · ${f.user.passportNumber}` : ''}
                  {f.context ? ` · ${f.context}` : ''}
                </span>
                <span className="atable__acts">
                  {f.status !== 'reviewed' && <button type="button" className="alink" onClick={() => setStatus(f, 'reviewed')}>Mark reviewed</button>}
                  {f.status !== 'resolved' && <button type="button" className="alink" onClick={() => setStatus(f, 'resolved')}>Resolve</button>}
                  <button type="button" className="alink" onClick={() => setReplying({ ...f, draft: f.reply?.message || '' })}>
                    {f.reply?.message ? 'Edit reply' : 'Reply'}
                  </button>
                  <button type="button" className="alink alink--bad" onClick={() => setRemoving(f)}>Delete</button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {replying && (
        <Modal
          title="Reply to feedback"
          onClose={() => setReplying(null)}
          onSubmit={sendReply}
          submitLabel="Send reply"
          busy={busy}
        >
          <p className="af__hint" style={{ marginBottom: 'var(--sp-4)' }}>
            <strong>They wrote:</strong> {replying.message}
          </p>
          <Field
            label="Your reply"
            as="textarea"
            rows={5}
            value={replying.draft}
            onChange={(e) => setReplying({ ...replying, draft: e.target.value })}
            hint={replying.user
              ? 'They will see this on the feedback page when signed in.'
              : 'This submission has no account attached, so nobody will see the reply. Use the email they left, if any.'}
          />
        </Modal>
      )}

      {removing && (
        <Confirm
          title="Delete feedback"
          body="This removes the comment permanently. Consider resolving it instead — resolved feedback stays on record."
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Success stories
   ══════════════════════════════════════════════════════════════ */

const EMPTY_STORY = { name: '', headline: '', story: '', roleTitle: '', imageUrl: '', published: false, order: 0 };

export function StoriesPanel({ onError }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => adminService.stories()
    .then((d) => setItems(d.stories))
    .catch((e) => onError(apiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editing._id) await adminService.updateStory(editing._id, editing);
      else await adminService.createStory(editing);
      setEditing(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const togglePublish = async (s) => {
    try {
      await adminService.updateStory(s._id, { published: !s.published });
      setItems((prev) => prev.map((x) => (x._id === s._id ? { ...x, published: !x.published } : x)));
    } catch (e) { onError(apiError(e)); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminService.deleteStory(removing._id);
      setRemoving(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Success stories</h2>
          <p className="apanel__sub">Nothing appears on the site until you publish it.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY_STORY })}>Add story</Button>
      </header>

      {loading ? <Empty>Loading…</Empty> : items.length === 0 ? (
        <Empty>No stories yet. Add one, or publish a story a traveller submitted.</Empty>
      ) : (
        <div className="atable">
          <div className="atable__head atable__row--story"><span>Name</span><span>Headline</span><span>Role</span><span>Status</span><span /></div>
          {items.map((s) => (
            <div className="atable__row atable__row--story" key={s._id}>
              <span className="atable__strong">{s.name}</span>
              <span className="atable__trunc">{s.headline}</span>
              <span className="atable__dim">{s.career?.title || s.roleTitle || '—'}</span>
              <span className={s.published ? 'atag atag--on' : 'atag'}>{s.published ? 'published' : 'draft'}</span>
              <span className="atable__acts">
                <button type="button" className="alink" onClick={() => togglePublish(s)}>{s.published ? 'Unpublish' : 'Publish'}</button>
                <button type="button" className="alink" onClick={() => setEditing({ ...s, career: s.career?._id || null })}>Edit</button>
                <button type="button" className="alink alink--bad" onClick={() => setRemoving(s)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing._id ? 'Edit story' : 'Add story'}
          onClose={() => setEditing(null)}
          onSubmit={save}
          busy={busy}
          wide
        >
          <Field label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
          <Field label="Headline" value={editing.headline} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} required hint="One line — what they achieved." />
          <Field label="Story" as="textarea" rows={6} value={editing.story} onChange={(e) => setEditing({ ...editing, story: e.target.value })} required />
          <Field label="Role title" value={editing.roleTitle} onChange={(e) => setEditing({ ...editing, roleTitle: e.target.value })} hint="Only needed if the role is not one of the careers in the bank." />
          <label className="acheck">
            <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
            <span>Published — visible on the site</span>
          </label>
        </Modal>
      )}

      {removing && (
        <Confirm
          title="Delete story"
          body={`"${removing.headline}" will be removed permanently. To take it off the site without losing it, unpublish instead.`}
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}
