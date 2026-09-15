import mongoose from 'mongoose';

/**
 * One answer choice. Kept as its own collection (not a subdocument) so the
 * weights are independently addressable — a QuizAnswer references the exact
 * option chosen, which makes per-option analytics and weight tuning possible
 * without rewriting question documents.
 *
 * Every option carries TWO vectors:
 *   fieldWeights — points toward the career fields (picks the field)
 *   riasec       — Holland axes (ranks individual careers inside/across fields)
 */
/**
 * The career fields the quiz can point toward. Keys match CareerField slugs.
 * The first six carry hand-set weights in the question bank; the rest are
 * derived at seed time from the careers in each field (seed/deriveFieldWeights.js).
 */
export const FIELD_KEYS = [
  'technology', 'design', 'business', 'healthcare', 'finance', 'media',
  'engineering', 'science', 'education', 'law', 'government', 'armed-forces',
  'architecture', 'agriculture', 'hospitality', 'aviation', 'sports', 'social',
  'fashion', 'skilled-trades',
];

const fieldWeightsSchema = new mongoose.Schema(
  Object.fromEntries(FIELD_KEYS.map((k) => [k, { type: Number, default: 0, min: 0, max: 5 }])),
  { _id: false }
);

const riasecWeightsSchema = new mongoose.Schema(
  {
    R: { type: Number, default: 0, min: 0, max: 5 },
    I: { type: Number, default: 0, min: 0, max: 5 },
    A: { type: Number, default: 0, min: 0, max: 5 },
    S: { type: Number, default: 0, min: 0, max: 5 },
    E: { type: Number, default: 0, min: 0, max: 5 },
    C: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false }
);

const quizOptionSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true, index: true },
    key: { type: String, required: true, trim: true },   // stable id within the question, e.g. 'a'
    label: { type: String, required: true, trim: true, maxlength: 160 },
    order: { type: Number, default: 0 },

    fieldWeights: { type: fieldWeightsSchema, default: () => ({}) },
    riasec: { type: riasecWeightsSchema, default: () => ({}) },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

quizOptionSchema.index({ question: 1, key: 1 }, { unique: true });

export const RIASEC_KEYS = ['R', 'I', 'A', 'S', 'E', 'C'];
export default mongoose.model('QuizOption', quizOptionSchema);
