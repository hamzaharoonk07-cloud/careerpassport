import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/media');

/** Images are small; a clip is not. Enforced on the decoded bytes. */
const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_VIDEO = 12 * 1024 * 1024;

/**
 * What we accept, and how to recognise it.
 *
 * The same rule the photograph and resume endpoints follow: an extension is a
 * claim, the leading bytes are evidence. This one matters most of the three —
 * whatever lands here is later played or shown to *other* people from our own
 * origin, so a file that is not what it says it is would run in their browser
 * rather than only in the uploader's.
 *
 * `at` is the offset the signature starts at. MP4 carries its `ftyp` box four
 * bytes in, after the box length.
 */
const ACCEPTED = {
  jpg:  { kind: 'image', mime: 'image/jpeg', at: 0, magic: [0xff, 0xd8, 0xff] },
  jpeg: { kind: 'image', mime: 'image/jpeg', at: 0, magic: [0xff, 0xd8, 0xff] },
  png:  { kind: 'image', mime: 'image/png',  at: 0, magic: [0x89, 0x50, 0x4e, 0x47] },
  webp: { kind: 'image', mime: 'image/webp', at: 0, magic: [0x52, 0x49, 0x46, 0x46] },
  gif:  { kind: 'image', mime: 'image/gif',  at: 0, magic: [0x47, 0x49, 0x46, 0x38] },
  mp4:  { kind: 'video', mime: 'video/mp4',  at: 4, magic: [0x66, 0x74, 0x79, 0x70] },
  webm: { kind: 'video', mime: 'video/webm', at: 0, magic: [0x1a, 0x45, 0xdf, 0xa3] },
};

const matches = (buf, spec) => spec.magic.every((b, i) => buf[spec.at + i] === b);

/**
 * Store a file and hand back the path it can be referenced by.
 *
 * Deliberately does not create a story or a media item — it only puts bytes on
 * disk and returns a URL. The caller then submits that URL through the normal
 * submission route, which is still moderated. Splitting it this way means an
 * upload can never publish anything by itself.
 *
 * Requires a session, unlike the submission routes themselves. Someone typing
 * a link is offering something already public; someone uploading a file is
 * putting bytes on our disk, and that should have a name attached to it.
 */
export const uploadMediaFile = asyncHandler(async (req, res) => {
  const { filename, data } = req.body;

  if (!data) throw ApiError.badRequest('No file was sent.', { data: 'Required' });

  const ext = String(filename || '').split('.').pop()?.toLowerCase();
  const accepted = ACCEPTED[ext];
  if (!accepted) {
    throw ApiError.badRequest('Upload an image (JPG, PNG, WebP, GIF) or a video (MP4, WebM).', {
      filename: 'Unsupported file type',
    });
  }

  const base64 = String(data).replace(/^data:[^;]+;base64,/, '');
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    throw ApiError.badRequest('That file could not be read.');
  }

  if (!buf.length) throw ApiError.badRequest('That file is empty.');

  const ceiling = accepted.kind === 'video' ? MAX_VIDEO : MAX_IMAGE;
  if (buf.length > ceiling) {
    throw ApiError.badRequest(
      `That ${accepted.kind} is over ${Math.round(ceiling / 1024 / 1024)} MB.`,
      { data: `Maximum ${Math.round(ceiling / 1024 / 1024)} MB` }
    );
  }

  if (!matches(buf, accepted)) {
    throw ApiError.badRequest(
      `That does not look like a ${ext.toUpperCase()} file. Upload the original.`,
      { filename: 'Content does not match the extension' }
    );
  }
  // RIFF and ftyp are containers, not formats. Check the tag that follows.
  if (ext === 'webp' && buf.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw ApiError.badRequest('That does not look like a WebP image.', {
      filename: 'Content does not match the extension',
    });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Random name, never the client's. A filename from a browser is a path
  // traversal waiting to happen, and two people uploading "clip.mp4" must not
  // collide.
  const stored = `${crypto.randomUUID()}.${ext}`;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(path.join(UPLOAD_DIR, stored));
    out.on('error', reject);
    out.on('finish', resolve);
    out.end(buf);
  });

  res.status(201).json({
    ok: true,
    url: `/uploads/media/${stored}`,
    kind: accepted.kind,
    mime: accepted.mime,
  });
});
