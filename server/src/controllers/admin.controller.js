import mongoose from 'mongoose';
import {
  User,
  Career,
  CareerField,
  QuizResult,
  QuizAnswer,
  SavedCareer,
  MediaItem,
  Feedback,
  SuccessStory,
} from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

/**
 * Admin surface.
 *
 * Every route here sits behind requireAuth + requireRole('admin'), enforced
 * server-side. Hiding the link in the UI is not authorisation — a sharp
 * evaluator will type the URL, and they should get a 403.
 *
 * Password hashes are never selected, so they cannot leak even by accident.
 */

/** Headline counts for the dashboard. */
export const stats = asyncHandler(async (req, res) => {
  // "Active" is a window, not a flag: someone who signed in within the last
  // 30 days. lastLoginAt is already stamped on every login, so this needs no
  // new bookkeeping.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    users, admins, results, saved, careers, fields, answers,
    activeUsers, media, feedbackNew, stories,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    QuizResult.countDocuments(),
    SavedCareer.countDocuments(),
    Career.countDocuments({ active: true }),
    CareerField.countDocuments({ active: true }),
    QuizAnswer.countDocuments(),
    User.countDocuments({ lastLoginAt: { $gte: since } }),
    MediaItem.countDocuments({ active: true }),
    Feedback.countDocuments({ status: 'new' }),
    SuccessStory.countDocuments({ published: true }),
  ]);

  // Which destinations people actually land on — the one genuinely
  // interesting number an admin cannot get anywhere else.
  const topMatches = await QuizResult.aggregate([
    { $match: { topMatch: { $ne: null } } },
    { $group: { _id: '$topMatch', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    { $lookup: { from: 'careers', localField: '_id', foreignField: '_id', as: 'career' } },
    { $unwind: '$career' },
    { $project: { _id: 0, count: 1, title: '$career.title', slug: '$career.slug' } },
  ]);

  // What people bookmark, as distinct from what they were matched to. The
  // two diverge, and the gap is the interesting part.
  const topSaved = await SavedCareer.aggregate([
    { $group: { _id: '$career', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    { $lookup: { from: 'careers', localField: '_id', foreignField: '_id', as: 'career' } },
    { $unwind: '$career' },
    { $project: { _id: 0, count: 1, title: '$career.title', slug: '$career.slug' } },
  ]);

  const signupsByDay = await User.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $limit: 14 },
  ]);

  /* ── Feedback analytics ────────────────────────────────────────
     Grouped rather than listed. Twenty comments tell an admin nothing at
     a glance; the split between bug reports and ideas, and whether the
     ratings are drifting, is the thing worth seeing on arrival. */
  const [byType, byRating, byStatus, replied] = await Promise.all([
    Feedback.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1 } },
    ]),
    Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Feedback.countDocuments({ 'reply.message': { $ne: '' } }),
  ]);

  const totalFeedback = byRating.reduce((n, r) => n + r.count, 0);
  const ratingSum = byRating.reduce((n, r) => n + r._id * r.count, 0);

  res.json({
    ok: true,
    feedbackAnalytics: {
      total: totalFeedback,
      replied,
      // Reported to one decimal, and null rather than NaN when there is
      // nothing to average — an empty state should read as empty.
      averageRating: totalFeedback ? Number((ratingSum / totalFeedback).toFixed(1)) : null,
      byType: byType.map((t) => ({
        type: t._id,
        count: t.count,
        avgRating: Number(t.avgRating.toFixed(1)),
      })),
      byRating: byRating.map((r) => ({ rating: r._id, count: r.count })),
      byStatus: byStatus.map((x) => ({ status: x._id, count: x.count })),
    },
    stats: {
      users, activeUsers, admins, results, saved, careers, fields, answers,
      media, feedbackNew, stories,
    },
    topMatches,
    topSaved,
    signupsByDay: signupsByDay.reverse(),
  });
});

/** Paged, searchable user list. */
export const listUsers = asyncHandler(async (req, res) => {
  const { q, role, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));

  const filter = {};
  if (role && ['user', 'admin'].includes(role)) filter.role = role;
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { passportNumber: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email passportNumber role accountType profile journeyStage createdAt lastLoginAt latestResult')
      .populate({ path: 'latestResult', select: 'topMatch takenAt', populate: { path: 'topMatch', select: 'title slug' } })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ ok: true, users, total, page: pageNum, pages: Math.ceil(total / perPage) });
});

/** One user, with everything they have done. */
export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('No such user.');

  const user = await User.findById(id)
    .select('name email passportNumber role accountType profile journeyStage createdAt lastLoginAt selectedField')
    .populate('selectedField', 'slug name')
    .lean();

  if (!user) throw ApiError.notFound('No such user.');

  const [results, saved] = await Promise.all([
    QuizResult.find({ user: id })
      .sort({ takenAt: -1 })
      .select('takenAt dominantAxes riasecVector questionsAnswered matches')
      .populate({ path: 'matches.career', select: 'title slug' })
      .lean(),
    SavedCareer.find({ user: id })
      .sort({ savedAt: -1 })
      .populate('career', 'title slug')
      .lean(),
  ]);

  res.json({
    ok: true,
    user,
    results: results.map((r) => ({
      ...r,
      // Only the top three matter in a list; the rest is noise here.
      matches: (r.matches || []).slice(0, 3),
    })),
    saved: saved.filter((s) => s.career),
  });
});

/**
 * Promote or demote a user.
 *
 * An admin cannot change their own role — that is how an installation ends up
 * with zero admins and no way back in.
 */
export const setRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) throw ApiError.badRequest('Role must be user or admin.');
  if (String(req.user._id) === String(id)) throw ApiError.badRequest('You cannot change your own role.');

  const user = await User.findByIdAndUpdate(id, { role }, { new: true })
    .select('name email passportNumber role')
    .lean();

  if (!user) throw ApiError.notFound('No such user.');
  res.json({ ok: true, user });
});

/**
 * Delete a user account and everything personal attached to it.
 *
 * Three guards, all of which matter more than the delete itself:
 *
 *   1. You cannot delete yourself. An admin removing their own account
 *      mid-session leaves a live token for a user that no longer exists.
 *
 *   2. You cannot delete the last administrator. Nobody would be able to
 *      reach the panel again, and there is no recovery path from that.
 *
 *   3. Their data goes with them. Results, answers and bookmarks are
 *      personal and are removed. Feedback is kept but detached — an
 *      administrator may be part-way through acting on a bug report, and
 *      the report is about the product, not the person. Their name and
 *      email are cleared from it either way.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (String(id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account from here.');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('No such user.');

  if (user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      throw ApiError.badRequest(
        'That is the only administrator left. Promote somebody else first, or nobody can reach this panel again.'
      );
    }
  }

  const [results, answers, saved] = await Promise.all([
    QuizResult.deleteMany({ user: user._id }),
    QuizAnswer.deleteMany({ user: user._id }),
    SavedCareer.deleteMany({ user: user._id }),
  ]);

  // Kept, but no longer identifiable.
  await Feedback.updateMany(
    { user: user._id },
    { $set: { user: null, name: '', email: '' } }
  );

  await user.deleteOne();

  res.json({
    ok: true,
    message:
      `Deleted ${user.email}, with ${results.deletedCount} result${results.deletedCount === 1 ? '' : 's'}, ` +
      `${answers.deletedCount} answer${answers.deletedCount === 1 ? '' : 's'} and ` +
      `${saved.deletedCount} bookmark${saved.deletedCount === 1 ? '' : 's'}. Any feedback they left was kept but anonymised.`,
  });
});
