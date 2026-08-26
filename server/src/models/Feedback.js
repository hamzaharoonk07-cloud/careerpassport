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

    // The brief asks for categorised feedback: a bug report and a feature
    // idea need different handling, and lumping them together means neither
    // gets it.
    type: {
      type: String,
      enum: ['bug', 'suggestion', 'query', 'praise'],
      default: 'suggestion',
      index: true,
    },

    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },

    // Where in the journey it was left, so patterns are visible.
    context: { type: String, trim: true, default: '' },

    /**
     * An administrator's answer.
     *
     * Kept on the feedback rather than in a separate thread: one reply is
     * what this needs, and a conversation would want notifications,
     * unread state and moderation that nothing here asks for yet.
     */
    reply: {
      message: { type: String, trim: true, maxlength: 2000, default: '' },
      at: { type: Date, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

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
