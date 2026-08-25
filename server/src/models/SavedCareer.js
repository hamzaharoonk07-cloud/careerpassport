import mongoose from 'mongoose';

const savedCareerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', required: true, index: true },
    note: { type: String, trim: true, maxlength: 400, default: '' },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { transform: (d, r) => { delete r.__v; return r; } } }
);

/** A user can only save a career once — enforced by the database, not the controller. */
savedCareerSchema.index({ user: 1, career: 1 }, { unique: true });

export default mongoose.model('SavedCareer', savedCareerSchema);
