import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';
import Upload from '../models/Upload.js';

/** 2 MB. A CV that does not fit in 2 MB is a portfolio. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * What we accept, and how to recognise it.
 *
 * The extension is a claim, not evidence — anything can be renamed .pdf. Each
 * type is checked against its magic bytes, so a script renamed to .pdf is
 * rejected before it is ever stored. The brief asks that the application
 * never produce malicious or unnecessary downloads, and the way that goes
 * wrong is accepting a file you did not verify and handing it back later.
 */
const ACCEPTED = {
  pdf: { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },            // %PDF
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          magic: [0x50, 0x4b, 0x03, 0x04] },                                    // PK.. (zip)
  doc: { mime: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0] },          // OLE2
};

const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

/**
 * Upload a resume.
 *
 * Sent as base64 in JSON rather than multipart, to avoid taking a file-upload
 * dependency for one endpoint. The size ceiling is enforced on the decoded
 * bytes, not the encoded string, since base64 inflates by a third.
 *
 * The verified bytes go into the database — see `models/Upload.js` for why
 * they are not written to disk.
 */
export const uploadResume = asyncHandler(async (req, res) => {
  const { filename, data } = req.body;

  if (!data) throw ApiError.badRequest('No file was sent.', { data: 'Required' });

  const ext = String(filename || '').split('.').pop()?.toLowerCase();
  const accepted = ACCEPTED[ext];
  if (!accepted) {
    throw ApiError.badRequest('Upload a PDF or Word document.', {
      filename: 'PDF, DOC or DOCX only',
    });
  }

  // Strip a data: URL prefix if the client sent one.
  const base64 = String(data).replace(/^data:[^;]+;base64,/, '');
  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    throw ApiError.badRequest('That file could not be read.');
  }

  if (!buf.length) throw ApiError.badRequest('That file is empty.');
  if (buf.length > MAX_BYTES) {
    throw ApiError.badRequest('That file is over 2 MB.', { data: 'Maximum 2 MB' });
  }
  if (!startsWith(buf, accepted.magic)) {
    throw ApiError.badRequest(
      `That does not look like a ${ext.toUpperCase()} file. Upload the original document.`,
      { filename: 'Content does not match the extension' }
    );
  }

  // Upsert, so replacing a resume overwrites the old row rather than leaving
  // an orphan no query will ever reach.
  await Upload.findOneAndUpdate(
    { user: req.user._id, kind: 'resume' },
    { data: buf, contentType: accepted.mime, filename: String(filename).slice(0, 120), size: buf.length },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  req.user.profile.resumeType = accepted.mime;
  // Kept only for display. It is never used to build a path.
  req.user.profile.resumeName = String(filename).slice(0, 120);
  await req.user.save();

  res.status(201).json({ ok: true, user: publicUser(req.user) });
});

/**
 * Download your own resume.
 *
 * Served as an attachment with sniffing disabled, so the browser stores it
 * rather than trying to render or execute it. Only the owner can fetch it —
 * the lookup is keyed on the session's user id, not on the request.
 */
export const downloadResume = asyncHandler(async (req, res) => {
  const file = await Upload.findOne({ user: req.user._id, kind: 'resume' }).select('+data');
  if (!file) throw ApiError.notFound('No resume on file.');

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(file.filename || 'resume').replace(/"/g, '')}"`
  );
  res.end(file.data);
});

export const deleteResume = asyncHandler(async (req, res) => {
  await Upload.deleteOne({ user: req.user._id, kind: 'resume' });
  req.user.profile.resumeType = '';
  req.user.profile.resumeName = '';
  await req.user.save();
  res.json({ ok: true, user: publicUser(req.user) });
});
