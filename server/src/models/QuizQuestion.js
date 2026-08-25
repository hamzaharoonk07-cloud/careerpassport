import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, unique: true, index: true },
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

export default mongoose.model('QuizQuestion', quizQuestionSchema);
