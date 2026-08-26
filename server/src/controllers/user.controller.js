import { CareerField, JOURNEY_STAGE_LIST } from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, profile, accountType } = req.body;
  if (name) req.user.name = name;
  if (accountType) req.user.accountType = accountType;
  if (profile) Object.assign(req.user.profile, profile);
  await req.user.save();
  res.json({ ok: true, user: publicUser(req.user) });
});

/**
 * Records how far through the cinematic journey the user got.
 *
 * This is what lets a refresh mid-journey resume instead of dumping
 * the user back at the passport.
 */
export const updateJourneyStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!JOURNEY_STAGE_LIST.includes(stage)) {
    throw ApiError.badRequest('Unknown journey stage.', { stage: 'Not a valid stage' });
  }
  // Never move a user backwards — refreshing an early page shouldn't wipe progress.
  const current = JOURNEY_STAGE_LIST.indexOf(req.user.journeyStage);
  const next = JOURNEY_STAGE_LIST.indexOf(stage);
  if (next > current) {
    req.user.journeyStage = stage;
    await req.user.save();
  }
  res.json({ ok: true, journeyStage: req.user.journeyStage });
});

/** The field chosen inside the train. Feeds the recommendation engine as a 10% weight. */
export const selectField = asyncHandler(async (req, res) => {
  const { fieldSlug } = req.body;
  const field = await CareerField.findOne({ slug: fieldSlug, active: true });
  if (!field) throw ApiError.badRequest('Unknown career field.', { fieldSlug: 'Not a valid field' });

  req.user.selectedField = field._id;
  if (JOURNEY_STAGE_LIST.indexOf(req.user.journeyStage) < JOURNEY_STAGE_LIST.indexOf('field-selected')) {
    req.user.journeyStage = 'field-selected';
  }
  await req.user.save();

  res.json({ ok: true, selectedField: field, journeyStage: req.user.journeyStage });
});
