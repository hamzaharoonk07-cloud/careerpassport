import mongoose from 'mongoose';

/**
 * An item in the multimedia centre — a video, an image, a document or a link.
 *
 * The file itself is not stored here. `url` points at something already
 * hosted (a clip in /videos, an external guide, a prospectus), which keeps
 * the database small and avoids standing up an upload pipeline for content
 * that is mostly links.
 */
const mediaItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, default: '', maxlength: 600 },

    kind: {
      type: String,
      enum: ['video', 'image', 'document', 'link'],
      required: true,
      index: true,
    },
    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, trim: true, default: '' },

    // Optional anchors, so the centre can be filtered by destination.
    career: { type: mongoose.Schema.Types.ObjectId, ref: 'Career', default: null, index: true },
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerField', default: null, index: true },

    order: { type: Number, default: 0 },

    /**
     * The visibility gate, and the moderation queue with it.
     *
     * Defaults true because an admin adding an item is publishing it. A
     * public submission sets it false explicitly — see submitMedia — so
     * nothing a visitor sends appears in the centre until it is reviewed,
     * the same rule success stories already follow.
     */
    active: { type: Boolean, default: true, index: true },

    /**
     * Who sent it in, when it came from the public form. Null for anything
     * an admin created, and null for an anonymous submission: the point is
     * attribution and an audit trail where one exists, not a requirement.
     */
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true }
);

mediaItemSchema.index({ active: 1, order: 1, createdAt: -1 });

export const MediaItem =
  mongoose.models.MediaItem || mongoose.model('MediaItem', mediaItemSchema);
