import mongoose from 'mongoose';

/**
 * Feedback left by a traveller.
 *
 * Kept separate from the user document so a person can leave more than one,
 * and so deleting feedback never touches an account. `user` is optional:
 * feedback can be left without signing in, and an account that is later
 * removed should not take its feedback with it.
 */
const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Denormalised so a submission still identifies itself when the account
    // is gone. Never used for auth, only for display in the panel.
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },

    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },

    // Where in the journey it was left, so patterns are visible.
    context: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

export const Feedback =
  mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
