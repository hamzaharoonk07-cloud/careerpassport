import mongoose from 'mongoose';

/**
 * A file belonging to one account, held in the database rather than on disk.
 *
 * The passport photograph and the resume used to be written under
 * `server/uploads/`. That works on a laptop and cannot work in production: a
 * Vercel function's filesystem is read-only apart from `/tmp`, so `mkdir`
 * threw EROFS before a single byte was written and every upload came back a
 * 500. `/tmp` would not have fixed it either — it is wiped when the container
 * goes away and is not shared between concurrent instances, so a photograph
 * written by one invocation is invisible to the next.
 *
 * These files are small and belong to exactly one user, so the database is
 * the right home: one place to store them, one place to back them up, and no
 * object-storage credentials to hold. The ceilings enforced by the
 * controllers — 1 MB for a photograph, 2 MB for a resume — sit far below
 * MongoDB's 16 MB document limit. A larger file (a video, say) would not fit
 * this shape and would need real object storage.
 */
const uploadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // One row per user per kind, enforced by the index below, so replacing a
    // file overwrites rather than accumulating copies nothing will ever read.
    kind: { type: String, enum: ['photo', 'resume'], required: true },

    /**
     * The bytes.
     *
     * `select: false` because almost every query that touches this collection
     * wants the metadata, not the payload — without it, listing a handful of
     * uploads would pull megabytes through the driver for no reason. The two
     * routes that serve a file ask for it explicitly with `.select('+data')`.
     */
    data: { type: Buffer, required: true, select: false },

    /**
     * Taken from the magic-byte check, never from what the client claimed.
     * This is what gets sent back as `Content-Type`, so it is the one field
     * where trusting the request would turn an upload into stored XSS.
     */
    contentType: { type: String, required: true },

    // Display only. It is never used to build a path.
    filename: { type: String, default: '' },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

uploadSchema.index({ user: 1, kind: 1 }, { unique: true });

export default mongoose.model('Upload', uploadSchema);
