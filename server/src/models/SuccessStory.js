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

    /**
     * The three beats of a career story, told in order.
     *
     * Optional, and separate from `story`. A story submitted as one block
     * still reads fine; these let one be told as a path — where they
     * started, what got in the way, and where it ended — which is the
     * shape the brief asks for and the shape that is actually useful to
     * somebody deciding.
     */
    path: { type: String, trim: true, maxlength: 1200, default: '' },
    challenges: { type: String, trim: true, maxlength: 1200, default: '' },
    outcome: { type: String, trim: true, maxlength: 1200, default: '' },

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
