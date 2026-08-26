import {
  Career,
  CareerField,
  QuizQuestion,
  QuizOption,
  QuizResult,
  Feedback,
  SuccessStory,
  MediaItem,
} from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

/**
 * Content administration: careers, quiz questions and their scoring, the
 * multimedia centre, feedback and success stories.
 *
 * Every route in here is already behind requireAuth + requireRole('admin')
 * at the router, so these handlers do not repeat that check.
 *
 * Two rules run through the file:
 *
 *   1. Careers and quiz questions are deactivated, not deleted, whenever a
 *      quiz result already points at them. A stored QuizResult names the
 *      careers it matched; hard-deleting one would leave a traveller's
 *      result referring to a destination that no longer exists.
 *
 *   2. Scoring weights are validated rather than trusted. The recommendation
 *      engine normalises each axis by the maximum reachable score, so an
 *      out-of-range weight does not just skew one answer — it rescales
 *      everybody's results.
 */

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];

/** Weights must be numbers inside the schema's range, or the engine drifts. */
function assertWeights(obj = {}, keys, max, label) {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null) continue;
    const n = Number(obj[k]);
    if (!Number.isFinite(n) || n < 0 || n > max) {
      throw ApiError.badRequest(
        `${label} "${k}" must be a number between 0 and ${max}.`,
        { [`${label}.${k}`]: `Must be 0–${max}` }
      );
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   Careers
   ══════════════════════════════════════════════════════════════ */

/** Admin listing: includes inactive rows, which the public list hides. */
export const listCareers = asyncHandler(async (req, res) => {
  const { q = '', page = 1, limit = 20 } = req.query;
  const filter = q ? { title: { $regex: String(q).trim(), $options: 'i' } } : {};

  const [careers, total] = await Promise.all([
    Career.find(filter)
      .populate('field', 'name slug')
      .sort({ title: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Career.countDocuments(filter),
  ]);

  res.json({
    ok: true,
    careers,
    total,
    page: Number(page),
    pages: Math.max(1, Math.ceil(total / Number(limit))),
  });
});

export const createCareer = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  body.slug = slugify(body.slug || body.title || '');
  if (!body.slug) throw ApiError.badRequest('A title is required.', { title: 'Required' });

  if (await Career.findOne({ slug: body.slug })) {
    throw ApiError.conflict('A career with that slug already exists.', { slug: 'Already in use' });
  }
  if (!(await CareerField.findById(body.field))) {
    throw ApiError.badRequest('Choose a field that exists.', { field: 'Unknown field' });
  }
  assertWeights(body.riasec, AXES, 10, 'riasec');

  const career = await Career.create(body);
  res.status(201).json({ ok: true, career });
});

export const updateCareer = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;

  if (body.slug) body.slug = slugify(body.slug);
  if (body.slug) {
    const clash = await Career.findOne({ slug: body.slug, _id: { $ne: req.params.id } });
    if (clash) throw ApiError.conflict('Another career already uses that slug.', { slug: 'Already in use' });
  }
  if (body.field && !(await CareerField.findById(body.field))) {
    throw ApiError.badRequest('Choose a field that exists.', { field: 'Unknown field' });
  }
  assertWeights(body.riasec, AXES, 10, 'riasec');

  const career = await Career.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  }).populate('field', 'name slug');

  if (!career) throw ApiError.notFound('No such career.');
  res.json({ ok: true, career });
});

/**
 * Remove a career — or retire it, if anyone's result already names it.
 *
 * Deleting one that a stored result matched would leave that traveller
 * looking at a destination the database can no longer describe, so those
 * are deactivated instead and the response says which happened.
 */
export const deleteCareer = asyncHandler(async (req, res) => {
  const career = await Career.findById(req.params.id);
  if (!career) throw ApiError.notFound('No such career.');

  const referenced = await QuizResult.countDocuments({ 'matches.career': career._id });
  if (referenced > 0) {
    career.active = false;
    await career.save();
    return res.json({
      ok: true,
      retired: true,
      message: `Retired rather than deleted: ${referenced} stored result${referenced === 1 ? '' : 's'} still reference this career.`,
    });
  }

  await career.deleteOne();
  res.json({ ok: true, retired: false, message: 'Career deleted.' });
});

/* ══════════════════════════════════════════════════════════════
   Quiz questions, options and scoring
   ══════════════════════════════════════════════════════════════ */

export const listQuestions = asyncHandler(async (req, res) => {
  const questions = await QuizQuestion.find()
    .sort({ order: 1 })
    .populate({ path: 'options', options: { sort: { order: 1 } } })
    .lean();
  res.json({ ok: true, questions });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { order, prompt, dimension, helper = '' } = req.body;

  if (await QuizQuestion.findOne({ order })) {
    throw ApiError.conflict('Another question already sits at that position.', {
      order: 'Position taken',
    });
  }

  const question = await QuizQuestion.create({ order, prompt, dimension, helper });
  res.status(201).json({ ok: true, question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  delete body.options; // options are managed through their own routes

  if (body.order !== undefined) {
    const clash = await QuizQuestion.findOne({ order: body.order, _id: { $ne: req.params.id } });
    if (clash) throw ApiError.conflict('Another question already sits at that position.', {
      order: 'Position taken',
    });
  }

  const question = await QuizQuestion.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  }).populate({ path: 'options', options: { sort: { order: 1 } } });

  if (!question) throw ApiError.notFound('No such question.');
  res.json({ ok: true, question });
});

/**
 * Delete a question and its options.
 *
 * Deactivated instead if any result was scored from it — the answers behind
 * a stored result have to keep meaning something.
 */
export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await QuizQuestion.findById(req.params.id);
  if (!question) throw ApiError.notFound('No such question.');

  const anyResults = await QuizResult.countDocuments();
  if (anyResults > 0) {
    question.active = false;
    await question.save();
    return res.json({
      ok: true,
      retired: true,
      message: 'Retired rather than deleted: results already exist that were scored with this question.',
    });
  }

  await QuizOption.deleteMany({ question: question._id });
  await question.deleteOne();
  res.json({ ok: true, retired: false, message: 'Question and its options deleted.' });
});

export const createOption = asyncHandler(async (req, res) => {
  const question = await QuizQuestion.findById(req.params.id);
  if (!question) throw ApiError.notFound('No such question.');

  const body = { ...req.body, question: question._id };
  assertWeights(body.riasec, AXES, 5, 'riasec');
  assertWeights(body.fieldWeights, Object.keys(body.fieldWeights || {}), 5, 'fieldWeights');

  const option = await QuizOption.create(body);
  question.options.push(option._id);
  await question.save();

  res.status(201).json({ ok: true, option });
});

export const updateOption = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  delete body.question;

  assertWeights(body.riasec, AXES, 5, 'riasec');
  assertWeights(body.fieldWeights, Object.keys(body.fieldWeights || {}), 5, 'fieldWeights');

  const option = await QuizOption.findByIdAndUpdate(req.params.optionId, body, {
    new: true,
    runValidators: true,
  });
  if (!option) throw ApiError.notFound('No such option.');
  res.json({ ok: true, option });
});

export const deleteOption = asyncHandler(async (req, res) => {
  const option = await QuizOption.findById(req.params.optionId);
  if (!option) throw ApiError.notFound('No such option.');

  // A question with fewer than two options cannot be answered.
  const siblings = await QuizOption.countDocuments({ question: option.question });
  if (siblings <= 2) {
    throw ApiError.badRequest(
      'A question needs at least two options — add a replacement before removing this one.'
    );
  }

  await QuizQuestion.findByIdAndUpdate(option.question, { $pull: { options: option._id } });
  await option.deleteOne();
  res.json({ ok: true, message: 'Option deleted.' });
});

/* ══════════════════════════════════════════════════════════════
   Multimedia centre
   ══════════════════════════════════════════════════════════════ */

export const listMedia = asyncHandler(async (req, res) => {
  const media = await MediaItem.find()
    .populate('career', 'title slug')
    .populate('field', 'name slug')
    .sort({ order: 1, createdAt: -1 })
    .lean();
  res.json({ ok: true, media });
});

export const createMedia = asyncHandler(async (req, res) => {
  const item = await MediaItem.create(req.body);
  res.status(201).json({ ok: true, item });
});

export const updateMedia = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  const item = await MediaItem.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!item) throw ApiError.notFound('No such media item.');
  res.json({ ok: true, item });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const item = await MediaItem.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('No such media item.');
  res.json({ ok: true, message: 'Media item deleted.' });
});

/* ══════════════════════════════════════════════════════════════
   Feedback
   ══════════════════════════════════════════════════════════════ */

export const listFeedback = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const feedback = await Feedback.find(filter)
    .populate('user', 'name email passportNumber')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ ok: true, feedback });
});

export const updateFeedback = asyncHandler(async (req, res) => {
  const { status, reply } = req.body;

  const update = {};
  if (status) update.status = status;

  // Replying marks it answered, so an admin cannot leave a reply sitting in
  // the "new" column and lose track of what has been dealt with.
  if (typeof reply === 'string' && reply.trim()) {
    update.reply = { message: reply.trim(), at: new Date(), by: req.user._id };
    update.status = status || 'resolved';
  }

  const item = await Feedback.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!item) throw ApiError.notFound('No such feedback.');
  res.json({ ok: true, item });
});

export const deleteFeedback = asyncHandler(async (req, res) => {
  const item = await Feedback.findByIdAndDelete(req.params.id);
  if (!item) throw ApiError.notFound('No such feedback.');
  res.json({ ok: true, message: 'Feedback deleted.' });
});

/* ══════════════════════════════════════════════════════════════
   Success stories
   ══════════════════════════════════════════════════════════════ */

export const listStories = asyncHandler(async (req, res) => {
  const stories = await SuccessStory.find()
    .populate('career', 'title slug')
    .populate('user', 'name email')
    .sort({ order: 1, createdAt: -1 })
    .lean();
  res.json({ ok: true, stories });
});

export const createStory = asyncHandler(async (req, res) => {
  const story = await SuccessStory.create(req.body);
  res.status(201).json({ ok: true, story });
});

export const updateStory = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  const story = await SuccessStory.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  }).populate('career', 'title slug');
  if (!story) throw ApiError.notFound('No such story.');
  res.json({ ok: true, story });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const story = await SuccessStory.findByIdAndDelete(req.params.id);
  if (!story) throw ApiError.notFound('No such story.');
  res.json({ ok: true, message: 'Story deleted.' });
});
