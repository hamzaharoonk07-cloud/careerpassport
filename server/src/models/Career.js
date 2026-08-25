import mongoose from 'mongoose';

/**
 * The six-axis Holland (RIASEC) vector every career carries.
 * Each axis is 0–10. This is the hinge of the recommendation engine:
 * the quiz produces the same shape for the user, and matching is
 * cosine similarity between the two. Established career-guidance
 * theory, fully explainable, no ML and no external API.
 */
const riasecSchema = new mongoose.Schema(
  {
    R: { type: Number, min: 0, max: 10, required: true }, // Realistic  — building, hands-on
    I: { type: Number, min: 0, max: 10, required: true }, // Investigative — analysing, solving
    A: { type: Number, min: 0, max: 10, required: true }, // Artistic — creating, expressing
    S: { type: Number, min: 0, max: 10, required: true }, // Social — helping, teaching
    E: { type: Number, min: 0, max: 10, required: true }, // Enterprising — leading, persuading
    C: { type: Number, min: 0, max: 10, required: true }, // Conventional — organising, precision
  },
  { _id: false }
);

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // How much this skill matters to the role, 1–5. Drives the skills-gap view.
    weight: { type: Number, min: 1, max: 5, default: 3 },
  },
  { _id: false }
);

const roadmapStageSchema = new mongoose.Schema(
  {
    stage: { type: Number, required: true, min: 1, max: 6 },
    title: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true, maxlength: 320 },
  },
  { _id: false }
);

/**
 * Salary and demand are deliberately nullable.
 * If a career has no verified figure we store null and the UI renders
 * "Information not available." We never invent numbers.
 */
const salarySchema = new mongoose.Schema(
  {
    entry: { type: Number, default: null },
    mid: { type: Number, default: null },
    senior: { type: Number, default: null },
    currency: { type: String, default: 'PKR' },
    period: { type: String, enum: ['month', 'year'], default: 'month' },
    source: { type: String, default: '' },
  },
  { _id: false }
);

const careerSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, index: 'text' },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerField', required: true, index: true },

    summary: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true },
    dayInLife: { type: String, trim: true, default: '' },

    skills: { type: [skillSchema], default: [] },
    learningAreas: { type: [String], default: [] },
    roadmap: { type: [roadmapStageSchema], default: [] },

    demand: {
      level: { type: String, enum: ['low', 'moderate', 'high', 'very-high', null], default: null },
      note: { type: String, default: '' },
    },
    salary: { type: salarySchema, default: () => ({}) },

    riasec: { type: riasecSchema, required: true },
    workStyle: {
      pace: { type: String, enum: ['steady', 'balanced', 'fast'], default: 'balanced' },
      collaboration: { type: String, enum: ['solo', 'mixed', 'team'], default: 'mixed' },
      environment: { type: String, enum: ['office', 'field', 'remote', 'clinical', 'studio'], default: 'office' },
    },

    related: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Career' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

careerSchema.index({ title: 'text', summary: 'text', 'skills.name': 'text' });
careerSchema.index({ field: 1, active: 1 });

// Note: whether we actually hold salary/demand figures is decided in
// utils/decorateCareer.js, not by a virtual. Every read path here is .lean(),
// and virtuals do not survive lean queries — a virtual would silently vanish.

export default mongoose.model('Career', careerSchema);
