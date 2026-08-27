import { Feedback, SuccessStory, MediaItem, Career } from '../models/index.js';
import { askCareers } from '../services/ask.service.js';
import { decorateCareer } from '../utils/decorateCareer.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

/**
 * The public face of the content an admin manages.
 *
 * Three modules had management but no front door: an admin could review
 * feedback nobody could leave, and publish media and stories nobody could
 * read. These are the reader-facing halves.
 *
 * Everything here is deliberately narrow. Only published stories and active
 * media are served, and submissions never set their own status — a visitor
 * cannot publish themselves.
 */

/* ── Multimedia centre ────────────────────────────────────────── */

export const listMedia = asyncHandler(async (req, res) => {
  const { kind, career } = req.query;
  const filter = { active: true };
  if (kind) filter.kind = kind;
  if (career) filter.career = career;

  const media = await MediaItem.find(filter)
    .populate('career', 'title slug')
    .populate('field', 'name slug')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  res.json({ ok: true, media });
});

/**
 * A visitor's contribution to the multimedia centre.
 *
 * The counterpart to submitStory, and it follows the same rule: the
 * submission never sets its own status. `active: false` is written here
 * rather than taken from the body, so nothing appears in the centre until an
 * admin turns it on from the panel that already manages these.
 *
 * The URL is checked rather than trusted, and this is the one place in the
 * product where that matters most: unlike a story, which is text, a media
 * item's URL is handed straight to a `<video src>`, an `<img src>` or an
 * anchor. A `javascript:` or `data:` URL there is script execution on
 * someone else's page. Only http and https are accepted, parsed rather than
 * pattern-matched — a regex over URLs is a losing game.
 */
const SUBMITTABLE_KINDS = new Set(['video', 'image', 'document', 'link']);

export const submitMedia = asyncHandler(async (req, res) => {
  const { title, description, kind, url } = req.body;

  if (!title?.trim()) throw ApiError.badRequest('A title is required.', { title: 'Required' });
  if (!SUBMITTABLE_KINDS.has(kind)) {
    throw ApiError.badRequest('Choose what kind of item this is.', { kind: 'Pick a type' });
  }

  let parsed;
  try {
    parsed = new URL(String(url || '').trim());
  } catch {
    throw ApiError.badRequest('That does not look like a link.', { url: 'Enter a full https:// address' });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw ApiError.badRequest('Links must start with http or https.', { url: 'Only http and https are accepted' });
  }

  const created = await MediaItem.create({
    title: title.trim(),
    description: (description || '').trim(),
    kind,
    url: parsed.href,
    submittedBy: req.user?._id || null,
    active: false,
  });

  res.status(201).json({
    ok: true,
    item: { id: created._id },
    message: 'Thank you — an administrator reviews it before it appears in the centre.',
  });
});

/* ── Success stories ──────────────────────────────────────────── */

export const listStories = asyncHandler(async (req, res) => {
  const { field } = req.query;

  const stories = await SuccessStory.find({ published: true })
    .populate({ path: 'career', select: 'title slug field', populate: { path: 'field', select: 'name slug' } })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  // Filtering by domain happens after populate because the field lives on the
  // career, not on the story.
  const filtered = field
    ? stories.filter((s) => s.career?.field?.slug === field)
    : stories;

  res.json({ ok: true, stories: filtered });
});

/**
 * Submit a story.
 *
 * Always unpublished. `published` is stripped rather than trusted — a client
 * that sends it should not be able to put itself on the site.
 */
export const submitStory = asyncHandler(async (req, res) => {
  const { name, headline, story, roleTitle, career } = req.body;

  const created = await SuccessStory.create({
    user: req.user?._id || null,
    name,
    headline,
    story,
    roleTitle: roleTitle || '',
    career: career || null,
    published: false,
  });

  res.status(201).json({
    ok: true,
    story: { id: created._id },
    message: 'Thank you — your story goes to an administrator for review before it appears.',
  });
});

/* ── Feedback ─────────────────────────────────────────────────── */

export const submitFeedback = asyncHandler(async (req, res) => {
  const { type, rating, message, context, name, email } = req.body;

  if (!message?.trim()) {
    throw ApiError.badRequest('Tell us what happened.', { message: 'Required' });
  }

  await Feedback.create({
    user: req.user?._id || null,
    // Signed-in submissions carry their own identity; the fields are only for
    // people who are not signed in.
    name: req.user?.name || name || '',
    email: req.user?.email || email || '',
    type: type || 'suggestion',
    rating: rating || 5,
    message,
    context: context || '',
    status: 'new',
  });

  res.status(201).json({ ok: true, message: 'Thank you — this reaches an administrator.' });
});

/**
 * Your own feedback, with any reply.
 *
 * Without this an administrator can answer into a void — the reply exists
 * but the person who asked never sees it. Scoped to the session, so it can
 * only ever return what this account submitted.
 */
export const myFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ user: req.user._id })
    .select('type rating message status reply createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ ok: true, feedback });
});

/* ── Ask in your own words ────────────────────────────────────── */

/**
 * Match careers from free text.
 *
 * Open to everyone: someone weighing up whether to register should be able
 * to ask first. Nothing is stored — this reads the question, answers it, and
 * forgets it.
 */
export const ask = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || !String(text).trim()) {
    throw ApiError.badRequest('Tell us what you like or dislike.', { text: 'Required' });
  }
  if (String(text).length > 600) {
    throw ApiError.badRequest('Keep it under 600 characters.', { text: 'Too long' });
  }

  const careers = await Career.find({ active: true })
    .populate('field', 'name slug')
    .lean();

  const { matches, read } = askCareers(String(text), careers);

  res.json({
    ok: true,
    matches: matches.map((m) => ({ ...m, career: decorateCareer(m.career) })),
    read: {
      understood: read.matchedTerms,
      avoiding: read.avoidedTerms,
      // Said plainly so a poor answer is legible rather than mysterious.
      hadSignal: read.signal > 0,
    },
  });
});
