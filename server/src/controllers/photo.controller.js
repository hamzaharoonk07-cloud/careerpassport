import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/photos');

/** 1 MB. This is displayed at 96px on a passport page, not printed. */
const MAX_BYTES = 1024 * 1024;

/**
 * What we accept, and how to recognise it.
 *
 * The same rule the resume upload follows: the extension is a claim, not
 * evidence. Each type is checked against its magic bytes, so a script renamed
 * to .png is rejected before it is written — and this one is served back with
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

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Named from the account id, never from user input — a filename from the
  // client is a path traversal waiting to happen.
  const stored = `${req.user._id}.${ext}`;

  // A previous photo in a different format would otherwise be orphaned on
  // disk and keep being served by the old extension.
  const previous = req.user.profile?.photoUrl;
  if (previous && previous !== stored) {
    await unlink(path.join(UPLOAD_DIR, previous)).catch(() => { /* already gone */ });
  }

  await new Promise((resolve, reject) => {
    const out = createWriteStream(path.join(UPLOAD_DIR, stored));
    out.on('error', reject);
    out.on('finish', resolve);
    out.end(buf);
  });

  req.user.profile.photoUrl = stored;
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
 * it: the path comes from the session, never from the request.
 */
export const getPhoto = asyncHandler(async (req, res) => {
  const stored = req.user.profile?.photoUrl;
  if (!stored) throw ApiError.notFound('No photograph on file.');

  const ext = stored.split('.').pop();
  const full = path.join(UPLOAD_DIR, `${req.user._id}.${ext}`);

  try {
    await stat(full);
  } catch {
    throw ApiError.notFound('No photograph on file.');
  }

  res.setHeader('Content-Type', ACCEPTED[ext]?.mime || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Private: this is one person's face, and it must not sit in a shared cache.
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  createReadStream(full).pipe(res);
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const stored = req.user.profile?.photoUrl;
  if (stored) {
    await unlink(path.join(UPLOAD_DIR, stored)).catch(() => { /* already gone */ });
  }
  req.user.profile.photoUrl = '';
  req.user.profile.photoName = '';
  await req.user.save();
  res.json({ ok: true, user: publicUser(req.user) });
});
