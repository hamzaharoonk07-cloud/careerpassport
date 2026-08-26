import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true },
    /** 0–100, already rounded. This is the number the UI counts up to. */
    score: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      riasec: { type: Number, default: 0 },
      field: { type: Number, default: 0 },
      workStyle: { type: Number, default: 0 },
    },
    /** Human sentences built from the top contributing factors — never generic filler. */
    reasons: { type: [String], default: [] },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Exactly which questions this attempt was served. The next attempt reads
    // this to avoid asking the same ones again.
    askedQuestions: { type: [mongoose.Schema.Types.ObjectId], ref: 'QuizQuestion', default: [] },
    selectedField: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerField', default: null },

    fieldScores: { type: Map, of: Number, default: () => new Map() },
    riasecVector: {
      R: { type: Number, default: 0 }, I: { type: Number, default: 0 },
      A: { type: Number, default: 0 }, S: { type: Number, default: 0 },
      E: { type: Number, default: 0 }, C: { type: Number, default: 0 },
    },
    /** The two dominant Holland axes, e.g. ['I','R'] — drives the copy. */
    dominantAxes: { type: [String], default: [] },

    matches: { type: [matchSchema], default: [] },
    topMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', default: null },

    questionsAnswered: { type: Number, default: 0 },
    engineVersion: { type: String, default: '1.0' },
    takenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

quizResultSchema.index({ user: 1, takenAt: -1 });

export default mongoose.model('QuizResult', quizResultSchema);
