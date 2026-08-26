import mongoose from 'mongoose';

/**
 * A traveller who reached their destination.
 *
 * Stories are unpublished until an admin publishes them, so nothing a user
 * submits appears on the site without review. `career` links the story to a
 * real destination in the bank rather than repeating its title as free text.
 */
const successStorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    name: { type: String, required: true, trim: true, maxlength: 80 },
    headline: { type: String, required: true, trim: true, maxlength: 140 },
    story: { type: String, required: true, trim: true, maxlength: 4000 },

    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', default: null, index: true },
    // Free text only where there is no matching destination in the bank.
    roleTitle: { type: String, trim: true, default: '' },

    imageUrl: { type: String, trim: true, default: '' },

    /**
     * Seeded illustrative content, not a real person's account.
     *
     * The page labels these so nobody mistakes them for genuine
     * testimonials, and an admin can clear them all once real submissions
     * arrive. A story left by an actual user never carries this.
     */
    isSample: { type: Boolean, default: false },

    // Nothing a user submits is visible until this is set.
    published: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

successStorySchema.index({ published: 1, order: 1, createdAt: -1 });

export const SuccessStory =
  mongoose.models.SuccessStory || mongoose.model('SuccessStory', successStorySchema);
