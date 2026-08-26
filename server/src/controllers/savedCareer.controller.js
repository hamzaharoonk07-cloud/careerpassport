import mongoose from 'mongoose';
import { Career, SavedCareer } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { decorateCareer } from '../utils/decorateCareer.js';

export const listSaved = asyncHandler(async (req, res) => {
  const saved = await SavedCareer.find({ user: req.user._id })
    .sort({ savedAt: -1 })
    .populate({
      path: 'career',
      select: 'slug title summary skills salary demand field',
      populate: { path: 'field', select: 'slug name icon accent' },
    })
    .lean();

  // A career deleted after being saved leaves a dangling reference — drop it from the response.
  res.json({
    ok: true,
    saved: saved.filter((s) => s.career).map((s) => ({ ...s, career: decorateCareer(s.career) })),
  });
});

export const saveCareer = asyncHandler(async (req, res) => {
  const { careerId, note = '' } = req.body;

  const query = mongoose.isValidObjectId(careerId)
    ? { _id: careerId }
    : { slug: String(careerId).toLowerCase() };
  const career = await Career.findOne({ ...query, active: true }).select('_id title').lean();
  if (!career) throw ApiError.notFound('We do not have a career by that name.');

  try {
    const saved = await SavedCareer.create({ user: req.user._id, career: career._id, note });
    res.status(201).json({ ok: true, saved, message: `${career.title} saved to your briefcase.` });
  } catch (err) {
    // The unique index on (user, career) is the real guard; this just makes it a friendly response.
    if (err.code === 11000) {
      return res.status(200).json({ ok: true, alreadySaved: true, message: `${career.title} is already saved.` });
    }
    throw err;
  }
});

export const unsaveCareer = asyncHandler(async (req, res) => {
  const { careerId } = req.params;

  const query = mongoose.isValidObjectId(careerId)
    ? { _id: careerId }
    : { slug: String(careerId).toLowerCase() };
  const career = await Career.findOne(query).select('_id').lean();
  if (!career) throw ApiError.notFound('We do not have a career by that name.');

  const deleted = await SavedCareer.findOneAndDelete({ user: req.user._id, career: career._id });
  if (!deleted) throw ApiError.notFound('That career was not in your saved list.');

  res.json({ ok: true, message: 'Removed from your saved careers.' });
});

/**
 * Update the note on a bookmark.
 *
 * Separate from saving, because a note is usually written later — you
 * bookmark something to come back to, and the reason you bookmarked it
 * arrives when you do.
 */
export const updateNote = asyncHandler(async (req, res) => {
  const { note = '' } = req.body;

  const saved = await SavedCareer.findOneAndUpdate(
    { user: req.user._id, career: req.params.careerId },
    { note: String(note).slice(0, 400) },
    { new: true }
  ).populate('career', 'title slug summary field salary');

  if (!saved) throw ApiError.notFound('That is not in your saved careers.');
  res.json({ ok: true, saved });
});
