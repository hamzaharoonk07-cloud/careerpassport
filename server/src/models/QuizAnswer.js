import mongoose from 'mongoose';

/**
 * One user's choice on one question, stored as its own document.
 *
 * Kept separate from QuizResult rather than embedded so that a single
 * answer can be queried across all users — that is what makes
 * "which option do students actually pick?" answerable without
 * unwinding every result document.
 */
const quizAnswerSchema = new mongoose.Schema(
  {
    result: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizResult', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true, index: true },
    option: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizOption', required: true },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

quizAnswerSchema.index({ result: 1, question: 1 }, { unique: true });

export default mongoose.model('QuizAnswer', quizAnswerSchema);
