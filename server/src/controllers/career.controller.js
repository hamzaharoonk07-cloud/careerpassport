import mongoose from 'mongoose';
import { Career, CareerField } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { decorateCareer, decorateCareers } from '../utils/decorateCareer.js';

export const listFields = asyncHandler(async (req, res) => {
  const fields = await CareerField.find({ active: true }).sort({ order: 1 }).lean();
  res.json({ ok: true, fields });
});

/**
 * The career bank.
 *
 * Supports free-text search, field filter, skill filter and paging.
 * Uses .lean() because nothing here needs a hydrated document, and a
 * list endpoint is the one most likely to be hit repeatedly.
 */
export const listCareers = asyncHandler(async (req, res) => {
  const { q, field, skill, sort = 'title', page = '1', limit = '24' } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(60, Math.max(1, Number(limit) || 24));

  const filter = { active: true };

  if (field) {
    const fieldDoc = await CareerField.findOne({ slug: field }).select('_id').lean();
    if (!fieldDoc) return res.json({ ok: true, careers: [], total: 0, page: pageNum, pages: 0 });
    filter.field = fieldDoc._id;
  }

  if (skill) {
    filter['skills.name'] = new RegExp(escapeRegex(skill), 'i');
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { summary: rx }, { 'skills.name': rx }, { learningAreas: rx }];
  }

  const sortMap = { title: { title: 1 }, newest: { createdAt: -1 } };

  const [careers, total] = await Promise.all([
    Career.find(filter)
      .populate('field', 'slug name icon accent order')
      .select('-related')
      .sort(sortMap[sort] || sortMap.title)
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    Career.countDocuments(filter),
  ]);

  res.json({
    ok: true,
    careers: decorateCareers(careers),
    total,
    page: pageNum,
    pages: Math.ceil(total / perPage),
  });
});

/** Accepts either a slug or an ObjectId, so /careers/:id works with clean URLs. */
export const getCareer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id.toLowerCase() };

  const career = await Career.findOne({ ...query, active: true })
    .populate('field', 'slug name icon accent tagline')
    .populate('related', 'slug title summary')
    .lean();

  if (!career) throw ApiError.notFound('We do not have a career by that name.');
  res.json({ ok: true, career: decorateCareer(career) });
});

/** Distinct skills across the bank — powers the skill filter dropdown. */
export const listSkills = asyncHandler(async (req, res) => {
  const skills = await Career.distinct('skills.name', { active: true });
  res.json({ ok: true, skills: skills.sort((a, b) => a.localeCompare(b)) });
});

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Careers similar to this one.
 *
 * Similarity is the distance between two RIASEC profiles — the same six
 * numbers the engine already matches people against — so "if you liked
 * this" means "this asks for the same things of you", not "other people
 * also clicked it".
 *
 * That distinction matters at this size. Collaborative filtering needs a
 * lot of traffic before it says anything true, and with a handful of users
 * it mostly recommends whatever is popular. Profile distance works from
 * the first visitor.
 */
export const similarCareers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const source = await Career.findOne(
    mongoose.isValidObjectId(id) ? { _id: id } : { slug: id }
  ).lean();
  if (!source) throw ApiError.notFound('We do not have a career by that name.');

  const others = await Career.find({ active: true, _id: { $ne: source._id } })
    .populate('field', 'name slug')
    .lean();

  const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];

  const scored = others.map((c) => {
    // Euclidean distance across the six axes, then inverted so a bigger
    // number means more alike.
    const d = Math.sqrt(
      AXES.reduce((sum, k) => sum + ((c.riasec?.[k] ?? 0) - (source.riasec?.[k] ?? 0)) ** 2, 0)
    );
    const sameField = String(c.field?._id) === String(source.field);
    return {
      career: c,
      // A shared field is a real signal, but a weak one — two roles in the
      // same field can want opposite things. It nudges rather than decides.
      score: 100 - d * 4 + (sameField ? 6 : 0),
      sameField,
    };
  });

  const similar = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((m) => ({
      career: decorateCareer(m.career),
      reason: m.sameField
        ? `Also ${m.career.field?.name}, and it asks for a similar mix of traits.`
        : 'A different field, but it asks for a similar mix of traits.',
    }));

  res.json({ ok: true, similar });
});
