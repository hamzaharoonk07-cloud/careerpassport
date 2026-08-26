import { Feedback, SuccessStory, MediaItem } from '../models/index.js';
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
