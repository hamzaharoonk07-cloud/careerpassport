/**
 * Media pipeline: Higgsfield masters → web-ready assets.
 *
 *   node tools/encode-media.mjs
 *
 * Reads every mp4 in media/higgsfield/raw/ and writes, into client/public/:
 *
 *   videos/<name>.mp4    H.264 1080p, faststart, tuned for a page background
 *   videos/<name>.webm   VP9, usually 30-40% smaller where the browser takes it
 *   images/<name>.jpg    poster extracted from the first frame
 *
 * The 2K masters come out of Higgsfield around 2.5 MB for five seconds, which
 * is over the 800 KB budget these clips have to live inside. 1080p is the
 * delivery resolution anyway — nothing on the site displays a video larger
 * than its own viewport, and a background plate does not need 2K detail.
 *
 * Masters are kept untouched in media/higgsfield/raw/ so a re-encode never
 * loses the original.
 */
import { execFile } from 'node:child_process';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RAW = path.join(ROOT, 'media/higgsfield/raw');
const OUT_VIDEO = path.join(ROOT, 'client/public/videos');
const OUT_IMAGE = path.join(ROOT, 'client/public/images');

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

/**
 * Clips the scroll film scrubs need a different encode from clips that just
 * play. Scrubbing seeks to an arbitrary time on every frame, and the decoder
 * must replay from the previous keyframe to get there — with default spacing
 * (~250 frames) that is a visible stutter. `-g 6` puts a keyframe every
 * quarter-second at 24fps so any seek lands within six frames of one.
 *
 * It costs roughly 40% more bytes, which is the trade: a scrubbable file is
 * bigger by nature. The height is dropped and the crf raised to pay for it,
 * and the component only loads it on pointer-fine devices anyway.
 */
const SCRUB_CLIPS = new Set(['journey']);

async function encode(file) {
  const name = path.basename(file, '.mp4');
  const src = path.join(RAW, file);
  const mp4 = path.join(OUT_VIDEO, `${name}.mp4`);
  const webm = path.join(OUT_VIDEO, `${name}.webm`);
  const poster = path.join(OUT_IMAGE, `${name}.jpg`);

  const before = await sizeOf(src);

  // H.264: the universal fallback. crf 26 is a deliberate choice — these are
  // dim, grainy, slow-moving plates behind text, and the extra fidelity of a
  // lower crf is invisible at playback size but very visible on the wire.
  const scrub = SCRUB_CLIPS.has(name);

  await run(ffmpegPath, [
    '-y', '-i', src,
    '-vf', scrub ? 'scale=-2:900' : 'scale=-2:1080',
    '-c:v', 'libx264', '-preset', 'slow',
    '-crf', scrub ? '29' : '26',
    ...(scrub ? ['-g', '6', '-keyint_min', '6', '-sc_threshold', '0'] : []),
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.0',
    '-movflags', '+faststart',   // metadata first, so playback can start on the first chunk
    '-an',                        // every clip is muted in the UI; the audio track is dead weight
    mp4,
  ]);

  await run(ffmpegPath, [
    '-y', '-i', src,
    '-vf', scrub ? 'scale=-2:900' : 'scale=-2:1080',
    '-c:v', 'libvpx-vp9', '-crf', scrub ? '36' : '34', '-b:v', '0',
    ...(scrub ? ['-g', '6', '-keyint_min', '6'] : []),
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    '-an',
    webm,
  ]);

  // Poster from the first frame — it is exactly what the viewer sees while
  // the video buffers, so any other frame would flash a jump cut.
  await run(ffmpegPath, [
    '-y', '-i', src,
    '-vf', 'scale=-2:720', '-frames:v', '1', '-q:v', '6',
    poster,
  ]);

  return {
    name,
    before,
    mp4: await sizeOf(mp4),
    webm: await sizeOf(webm),
    poster: await sizeOf(poster),
  };
}

await mkdir(OUT_VIDEO, { recursive: true });
await mkdir(OUT_IMAGE, { recursive: true });

const files = (await readdir(RAW)).filter((f) => f.endsWith('.mp4'));
if (!files.length) {
  console.log('No masters in media/higgsfield/raw/ — nothing to encode.');
  process.exit(0);
}

console.log(`Encoding ${files.length} clip${files.length === 1 ? '' : 's'}…\n`);

const results = [];
for (const file of files) {
  process.stdout.write(`  ${file} … `);
  try {
    const r = await encode(file);
    results.push(r);
    console.log(`${kb(r.before)} → mp4 ${kb(r.mp4)} · webm ${kb(r.webm)} · poster ${kb(r.poster)}`);
  } catch (err) {
    console.log('FAILED');
    console.error(err.stderr?.toString().split('\n').slice(-6).join('\n') || err.message);
  }
}

const total = results.reduce((sum, r) => sum + r.mp4, 0);
const saved = results.reduce((sum, r) => sum + (r.before - r.mp4), 0);

console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${results.length} encoded · mp4 total ${kb(total)} · saved ${kb(saved)}`);
const over = results.filter((r) => r.mp4 > 800 * 1024 && !SCRUB_CLIPS.has(r.name));
if (over.length) {
  console.log(`  ⚠  over the 800 KB budget: ${over.map((r) => `${r.name} (${kb(r.mp4)})`).join(', ')}`);
}
console.log(`${'─'.repeat(52)}\n`);
