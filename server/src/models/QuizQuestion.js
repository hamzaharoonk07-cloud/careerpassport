import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    // The slot this question fills in the quiz, 1..N. No longer unique on its
    // own: several questions share a slot as alternative phrasings of the same
    // measurement, and one is chosen per attempt so a retake is not a rerun.
    order: { type: Number, required: true, index: true },

    // Which alternative within the slot. Same dimension, same weights in
    // spirit, different situation put to the traveller.
    variant: { type: Number, default: 1, min: 1 },
    prompt: { type: String, required: true, trim: true, maxlength: 240 },

    /** What the question is actually measuring — shown as the eyebrow above it. */
    dimension: {
      type: String,
      required: true,
      enum: [
        'interests', 'strengths', 'problem-solving', 'creativity', 'communication',
        'technical-interest', 'business-interest', 'work-environment', 'learning-preference', 'values',
      ],
    },
    helper: { type: String, trim: true, default: '' },
    options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizOption' }],
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

// A slot may hold many variants, but not two with the same number.
quizQuestionSchema.index({ order: 1, variant: 1 }, { unique: true });

export default mongoose.model('QuizQuestion', quizQuestionSchema);
