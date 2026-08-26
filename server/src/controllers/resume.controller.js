import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { publicUser } from './auth.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/resumes');

/** 2 MB. A CV that does not fit in 2 MB is a portfolio. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * What we accept, and how to recognise it.
 *
 * The extension is a claim, not evidence — anything can be renamed .pdf. Each
 * type is checked against its magic bytes, so a script renamed to .pdf is
 * rejected before it is ever written. The brief asks that the application
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

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Named from the account id, never from user input — a filename from the
  // client is a path traversal waiting to happen.
  const stored = `${req.user._id}.${ext}`;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(path.join(UPLOAD_DIR, stored));
    out.on('error', reject);
    out.on('finish', resolve);
    out.end(buf);
  });

  req.user.profile.resumeUrl = stored;
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
 * the path is derived from the session, not from the request.
 */
export const downloadResume = asyncHandler(async (req, res) => {
  const stored = req.user.profile?.resumeUrl;
  if (!stored) throw ApiError.notFound('No resume on file.');

  const ext = stored.split('.').pop();
  const full = path.join(UPLOAD_DIR, `${req.user._id}.${ext}`);

  try {
    await stat(full);
  } catch {
    throw ApiError.notFound('No resume on file.');
  }

  res.setHeader('Content-Type', ACCEPTED[ext]?.mime || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${(req.user.profile.resumeName || `resume.${ext}`).replace(/"/g, '')}"`
  );
  createReadStream(full).pipe(res);
});

export const deleteResume = asyncHandler(async (req, res) => {
  const stored = req.user.profile?.resumeUrl;
  if (stored) {
    await unlink(path.join(UPLOAD_DIR, stored)).catch(() => { /* already gone */ });
  }
  req.user.profile.resumeUrl = '';
  req.user.profile.resumeName = '';
  await req.user.save();
  res.json({ ok: true, user: publicUser(req.user) });
});
