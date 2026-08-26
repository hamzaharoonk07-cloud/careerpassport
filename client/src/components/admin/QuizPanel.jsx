import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button.jsx';
import { Field, Modal, Confirm, Empty, WeightRow } from './ui.jsx';
import { adminService } from '../../services/admin.service.js';
import { apiError } from '../../services/api.js';

const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];
const FIELDS = ['technology', 'design', 'business', 'healthcare', 'finance', 'media'];

const DIMENSIONS = [
  'interests', 'strengths', 'problem-solving', 'creativity', 'communication',
  'technical-interest', 'business-interest', 'work-environment', 'learning-preference', 'values',
];

const EMPTY_Q = { order: 1, prompt: '', dimension: 'interests', helper: '', active: true };
const EMPTY_O = { key: '', label: '', order: 0, riasec: {}, fieldWeights: {} };

/**
 * Quiz questions and the scoring behind them.
 *
 * The weights on each option are the scoring logic — there is no separate
 * formula to edit. An option contributes its RIASEC numbers to the
 * traveller's profile and its field numbers to the field affinity, and the
 * engine normalises both by the maximum reachable score. That last part is
 * why editing weights is a bigger deal than editing wording, and the panel
 * says so rather than letting someone find out later.
 */
export function QuizPanel({ onError }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [editingQ, setEditingQ] = useState(null);
  const [editingO, setEditingO] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = () => adminService.questions()
    .then((d) => setQuestions(d.questions))
    .catch((e) => onError(apiError(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const saveQuestion = async () => {
    setBusy(true);
    try {
      if (editingQ._id) await adminService.updateQuestion(editingQ._id, editingQ);
      else await adminService.createQuestion(editingQ);
      setEditingQ(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const saveOption = async () => {
    setBusy(true);
    try {
      const { questionId, ...body } = editingO;
      if (body._id) await adminService.updateOption(questionId, body._id, body);
      else await adminService.createOption(questionId, body);
      setEditingO(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = removing.kind === 'question'
        ? await adminService.deleteQuestion(removing.item._id)
        : await adminService.deleteOption(removing.questionId, removing.item._id);
      if (res.message) setNotice(res.message);
      setRemoving(null);
      await load();
    } catch (e) { onError(apiError(e)); } finally { setBusy(false); }
  };

  const nextOrder = questions.length ? Math.max(...questions.map((q) => q.order)) + 1 : 1;

  return (
    <section className="apanel">
      <header className="apanel__head">
        <div>
          <h2 className="apanel__title">Quiz questions &amp; scoring logic</h2>
          <p className="apanel__sub">
            Each option carries the weights it contributes. Those weights <em>are</em> the scoring —
            the engine normalises them against the highest score reachable, so a change here shifts every future result.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditingQ({ ...EMPTY_Q, order: nextOrder })}>Add question</Button>
      </header>

      {notice && <p className="anotice" role="status">{notice}</p>}

      {loading ? <Empty>Loading…</Empty> : questions.length === 0 ? (
        <Empty>No questions yet. The quiz needs at least one.</Empty>
      ) : (
        <div className="aqs">
          {questions.map((q) => (
            <article className="aq" key={q._id}>
              <header className="aq__head">
                <button
                  type="button"
                  className="aq__toggle"
                  onClick={() => setOpen(open === q._id ? null : q._id)}
                  aria-expanded={open === q._id}
                >
                  <span className="aq__n">{q.order}</span>
                  <span className="aq__prompt">{q.prompt}</span>
                </button>
                <span className="atable__mono atable__dim">{q.dimension}</span>
                {!q.active && <span className="atag">retired</span>}
                <span className="atable__acts">
                  <button type="button" className="alink" onClick={() => setEditingQ({ ...q })}>Edit</button>
                  <button type="button" className="alink alink--bad" onClick={() => setRemoving({ kind: 'question', item: q })}>Delete</button>
                </span>
              </header>

              {open === q._id && (
                <div className="aq__body">
                  {(q.options || []).map((o) => (
                    <div className="aopt" key={o._id}>
                      <span className="aopt__key">{o.key}</span>
                      <span className="aopt__label">{o.label}</span>
                      <span className="atable__mono atable__dim">
                        {AXES.filter((a) => o.riasec?.[a]).map((a) => `${a}${o.riasec[a]}`).join(' ') || 'no RIASEC weight'}
                      </span>
                      <span className="atable__acts">
                        <button type="button" className="alink" onClick={() => setEditingO({ ...o, questionId: q._id })}>Edit</button>
                        <button type="button" className="alink alink--bad" onClick={() => setRemoving({ kind: 'option', item: o, questionId: q._id })}>Delete</button>
                      </span>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setEditingO({ ...EMPTY_O, questionId: q._id, order: (q.options || []).length })}>
                    Add option
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {editingQ && (
        <Modal
          title={editingQ._id ? 'Edit question' : 'Add question'}
          onClose={() => setEditingQ(null)}
          onSubmit={saveQuestion}
          busy={busy}
          wide
        >
          <Field label="Position" type="number" min="1" value={editingQ.order} onChange={(e) => setEditingQ({ ...editingQ, order: Number(e.target.value) })} required hint="Order in the quiz. Two questions cannot share a position." />
          <Field label="Prompt" as="textarea" rows={2} value={editingQ.prompt} onChange={(e) => setEditingQ({ ...editingQ, prompt: e.target.value })} required />
          <Field label="Dimension" as="select" value={editingQ.dimension} onChange={(e) => setEditingQ({ ...editingQ, dimension: e.target.value })}>
            {DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Field>
          <Field label="Helper text" value={editingQ.helper} onChange={(e) => setEditingQ({ ...editingQ, helper: e.target.value })} hint="Optional line under the prompt." />
          <label className="acheck">
            <input type="checkbox" checked={editingQ.active} onChange={(e) => setEditingQ({ ...editingQ, active: e.target.checked })} />
            <span>Active — asked in the quiz</span>
          </label>
        </Modal>
      )}

      {editingO && (
        <Modal
          title={editingO._id ? 'Edit option' : 'Add option'}
          onClose={() => setEditingO(null)}
          onSubmit={saveOption}
          busy={busy}
          wide
        >
          <Field label="Key" value={editingO.key} onChange={(e) => setEditingO({ ...editingO, key: e.target.value })} required hint="A stable short id within the question, such as a, b, c." />
          <Field label="Label" value={editingO.label} onChange={(e) => setEditingO({ ...editingO, label: e.target.value })} required />
          <WeightRow
            label="RIASEC weights"
            keys={AXES}
            max={5}
            value={editingO.riasec}
            onChange={(riasec) => setEditingO({ ...editingO, riasec })}
            hint="0–5 per axis. What choosing this option says about the traveller."
          />
          <WeightRow
            label="Field affinity"
            keys={FIELDS}
            max={5}
            value={editingO.fieldWeights}
            onChange={(fieldWeights) => setEditingO({ ...editingO, fieldWeights })}
            hint="0–5 per field. Contributes 30% of the final score."
          />
        </Modal>
      )}

      {removing && (
        <Confirm
          title={removing.kind === 'question' ? 'Delete question' : 'Delete option'}
          body={
            removing.kind === 'question'
              ? 'If any quiz results already exist, this question is retired rather than deleted — the answers behind a stored result have to keep meaning something.'
              : 'A question needs at least two options; if this is one of the last two, the server will refuse.'
          }
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
          busy={busy}
        />
      )}
    </section>
  );
}
