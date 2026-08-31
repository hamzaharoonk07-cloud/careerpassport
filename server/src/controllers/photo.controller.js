import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';
import Upload from '../models/Upload.js';

/** 1 MB. This is displayed at 96px on a passport page, not printed. */
const MAX_BYTES = 1024 * 1024;

/**
 * What we accept, and how to recognise it.
 *
 * The same rule the resume upload follows: the extension is a claim, not
 * evidence. Each type is checked against its magic bytes, so a script renamed
 * to .png is rejected before it is stored — and this one is served back with
 * an image content type, which makes accepting an unverified file worse here
 * than it is for a download.
 *
 * SVG is deliberately not on the list. It is a document, not a bitmap: it can
 * carry script, and serving one from our own origin would run it there.
 */
const ACCEPTED = {
  jpg: { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  jpeg: { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  png: { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  webp: { mime: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF….WEBP
};

const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

/**
 * Upload the passport photograph.
 *
 * Sent as base64 in JSON rather than multipart, matching the resume endpoint
 * so there is one upload shape in the product rather than two. The ceiling is
 * enforced on the decoded bytes, since base64 inflates by a third.
 *
 * The verified bytes go into the database — see `models/Upload.js` for why
 * they are not written to disk.
 */
export const uploadPhoto = asyncHandler(async (req, res) => {
  const { filename, data } = req.body;

  if (!data) throw ApiError.badRequest('No image was sent.', { data: 'Required' });

  const ext = String(filename || '').split('.').pop()?.toLowerCase();
  const accepted = ACCEPTED[ext];
  if (!accepted) {
    throw ApiError.badRequest('Upload a JPG, PNG or WebP image.', {
      filename: 'JPG, PNG or WebP only',
    });
  }

  const base64 = String(data).replace(/^data:[^;]+;base64,/, '');
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    throw ApiError.badRequest('That image could not be read.');
  }

  if (!buf.length) throw ApiError.badRequest('That file is empty.');
  if (buf.length > MAX_BYTES) {
    throw ApiError.badRequest('That image is over 1 MB.', { data: 'Maximum 1 MB' });
  }
  if (!startsWith(buf, accepted.magic)) {
    throw ApiError.badRequest(
      `That does not look like a ${ext.toUpperCase()} image. Upload the original file.`,
      { filename: 'Content does not match the extension' }
    );
  }
  // RIFF alone is not enough for WebP — it is the container every RIFF file
  // starts with. The format tag sits four bytes later.
  if (ext === 'webp' && buf.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw ApiError.badRequest('That does not look like a WebP image.', {
      filename: 'Content does not match the extension',
    });
  }

  // Upsert, so replacing a photograph overwrites the old row rather than
  // leaving an orphan no query will ever reach.
  await Upload.findOneAndUpdate(
    { user: req.user._id, kind: 'photo' },
    { data: buf, contentType: accepted.mime, filename: String(filename).slice(0, 120), size: buf.length },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  req.user.profile.photoType = accepted.mime;
  req.user.profile.photoName = String(filename).slice(0, 120);
  await req.user.save();

  res.status(201).json({ ok: true, user: publicUser(req.user) });
});

/**
 * Serve your own photograph.
 *
 * Inline rather than as an attachment, because this one is meant to be looked
 * at — but with sniffing disabled and a Content-Type taken from the verified
 * magic bytes, not from anything the client said. Only the owner can fetch
 * it: the lookup is keyed on the session's user id, never on the request.
 */
export const getPhoto = asyncHandler(async (req, res) => {
  const file = await Upload.findOne({ user: req.user._id, kind: 'photo' }).select('+data');
  if (!file) throw ApiError.notFound('No photograph on file.');

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Private: this is one person's face, and it must not sit in a shared cache.
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  res.end(file.data);
});

export const deletePhoto = asyncHandler(async (req, res) => {
  await Upload.deleteOne({ user: req.user._id, kind: 'photo' });
  req.user.profile.photoType = '';
  req.user.profile.photoName = '';
  await req.user.save();
  res.json({ ok: true, user: publicUser(req.user) });
});
