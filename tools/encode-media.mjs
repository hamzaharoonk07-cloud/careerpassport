/**
 * Media pipeline: Higgsfield masters → web-ready assets.
 *
 *   node tools/encode-media.mjs           encode everything in the manifest
 *   node tools/encode-media.mjs --check   compare what ships against the
 *                                         manifest, write nothing
 *
 * Masters are kept untouched in media/higgsfield/raw/ so a re-encode never
 * loses the original.
 *
 * ── Why a manifest, and not "every mp4 in raw/" ──────────────────────────
 *
 * This script used to walk the raw folder and encode each file to its own
 * name at a single set of settings. That stopped describing reality: the
 * shipped set had grown portrait crops, a mobile cut and a trimmed clip,
 * all made by hand, and one output no longer even shared a name with its
 * source. Re-running the script would have quietly replaced good assets
 * with wrong ones — `briefcase.mp4` rebuilt from the wrong master, the
 * landing plate back to its untrimmed ten seconds, the scroll film without
 * the keyframe spacing that makes it scrubbable.
 *
 * Every output is therefore declared below with the source it comes from
 * and the treatment it gets. `--check` verifies the shipped files still
 * match, so the drift that caused this cannot happen silently again.
 *
 * ── The three kinds of output ────────────────────────────────────────────
 *
 * plate   Plays linearly, start to finish, as a page background. 1080p at
 *         crf26: these are dim, grainy, slow-moving pictures behind text,
 *         and a lower crf is invisible at playback size but very visible
 *         on the wire. Gets a WebM sibling and a 2K sibling.
 *
 * scrub   Driven by the scrollbar. Seeking replays from the previous
 *         keyframe, so with default spacing (~250 frames) every seek is a
 *         visible stutter. `-g 6` puts one every quarter-second at 24fps.
 *         That costs roughly 40% more bytes, paid for with a lower height
 *         and a higher crf. Never gets a 2K sibling — see the note on
 *         HI_TIER below.
 *
 * cut     A hand-shaped variant: a portrait crop, or a lighter mobile
 *         encode. Whatever the manifest says, nothing inferred.
 */
import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
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
const sizeOf = async (f) => { try { return (await stat(f)).size; } catch { return 0; } };

/**
 * The 2K tier, for displays with the pixels to show it.
 *
 * Measured on `terminal` against the 2K master, both sides scaled to 1440p
 * so the comparison happens on one grid:
 *
 *     1080p crf26 (the plate default)   VMAF 89.6   1024 KB
 *     1440p crf30                       VMAF 89.5   1081 KB   ← no gain
 *     1440p crf28                       VMAF 92.3   1441 KB   ← the tier
 *
 * crf30 at 1440p is the same picture as crf26 at 1080p — the extra pixels
 * are spent back on compression. crf28 is where the resolution actually
 * buys something, and it costs about 40% more bytes. There is no encode
 * setting that makes 2K free.
 *
 * Scrub clips are excluded on purpose. A seek decodes up to six frames,
 * which is 8.6M pixels at 900p and 22M at 1440p; times the seek rate, 2K
 * is hundreds of millions of pixels a second for a plate behind a scrim.
 * Resolution is the one thing a scrubbed film cannot afford.
 */
const HI_TIER = { height: 1440, crf: 28 };

/** Every file that ships, and exactly where it comes from. */
const MANIFEST = [
  // ── Plates ──────────────────────────────────────────────────────────
  { out: 'terminal',       from: 'terminal.mp4',       kind: 'plate' },
  { out: 'cabin',          from: 'cabin.mp4',          kind: 'plate' },
  { out: 'gate',           from: 'gate.mp4',           kind: 'plate' },
  { out: 'arrival',        from: 'arrival.mp4',        kind: 'plate' },
  { out: 'cruise',         from: 'cruise.mp4',         kind: 'plate' },
  { out: 'stamp',          from: 'stamp.mp4',          kind: 'plate' },
  { out: 'takeoff',        from: 'takeoff.mp4',        kind: 'plate' },
  { out: 'boarding',       from: 'boarding.mp4',       kind: 'plate' },
  { out: 'passport-intro', from: 'passport-intro.mp4', kind: 'plate' },

  // The master runs 10.13s but the flight sequence chains on `ended`, and
  // the landing beat is timed to six. Trimming here rather than in the
  // player keeps the 2K sibling the same length as the 1080p one — they
  // drifted apart the first time this tier was built, and a hi-res visitor
  // sat on the landing four seconds longer than everyone else.
  { out: 'landing', from: 'landing.mp4', kind: 'plate', trim: 6 },

  // ── Scrubbed films ──────────────────────────────────────────────────
  { out: 'journey',   from: 'journey.mp4',        kind: 'scrub', height: 900, crf: 29 },
  // Named for the shot, not the file: the shipped briefcase film is the
  // *opening* master. Confirmed frame-for-frame, not assumed.
  { out: 'briefcase', from: 'briefcase-open.mp4', kind: 'scrub', height: 720, crf: 29 },

  // ── Hand-shaped cuts ────────────────────────────────────────────────
  // Portrait crops. Handing a phone the landscape master means
  // `object-fit: cover` throws away two thirds of the width, which is what
  // reads as being zoomed in. Crop to 9:16 from the centre first.
  {
    out: 'journey-portrait', from: 'journey.mp4', kind: 'cut',
    vf: 'crop=ih*9/16:ih,scale=608:1080', gop: 6, crf: 30,
  },
  {
    out: 'briefcase-portrait', from: 'briefcase-open.mp4', kind: 'cut',
    vf: 'crop=ih*9/16:ih,scale=540:960', gop: 6, crf: 30,
  },
  // The stacked (non-scrubbing) fallback plays this rather than seeking it,
  // so it wants ordinary keyframe spacing and a fifth of the size.
  {
    out: 'journey-m', from: 'journey.mp4', kind: 'cut',
    vf: 'scale=-2:720', crf: 32,
  },
];

/** Which outputs carry a poster. Only the ones a component names as one. */
const POSTERS = new Set([
  'terminal', 'cabin', 'gate', 'arrival', 'cruise', 'stamp',
  'takeoff', 'boarding', 'passport-intro', 'landing', 'journey', 'briefcase',
]);

const h264 = (extra) => [
  '-c:v', 'libx264', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-movflags', '+faststart',
  '-an', // every clip is muted in the UI; the audio track is dead weight
  ...extra,
];

/** Keyframe controls, or nothing at all when the clip is never seeked. */
const gopArgs = (g) => (g ? ['-g', String(g), '-keyint_min', String(g), '-sc_threshold', '0'] : []);

async function encodeOne(item) {
  const src = path.join(RAW, item.from);
  const trim = item.trim ? ['-t', String(item.trim)] : [];
  const written = {};

  const scrub = item.kind === 'scrub';
  const height = item.height ?? 1080;
  const crf = item.crf ?? (scrub ? 29 : 26);
  const vf = item.vf ?? `scale=-2:${height}`;
  const gop = item.gop ?? (scrub ? 6 : 0);

  // The baseline H.264 every visitor can play.
  const mp4 = path.join(OUT_VIDEO, `${item.out}.mp4`);
  await run(ffmpegPath, [
    '-y', ...trim, '-i', src, '-vf', vf,
    ...h264(['-crf', String(crf), ...gopArgs(gop), '-level', '4.0', mp4]),
  ]);
  written.mp4 = await sizeOf(mp4);

  // WebM, for plates only. On a scrub clip the forced keyframes make VP9
  // *larger* than H.264, so preferring it would serve the heavier file for
  // no benefit — and the player lists mp4 first there for that reason.
  if (item.kind === 'plate') {
    const webm = path.join(OUT_VIDEO, `${item.out}.webm`);
    await run(ffmpegPath, [
      '-y', ...trim, '-i', src, '-vf', vf,
      '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0',
      '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
      '-an', webm,
    ]);
    written.webm = await sizeOf(webm);

    // Level 5.1, not 4.0 — 4.0 does not admit 1440p, and a stream that
    // declares a level it exceeds is what makes a hardware decoder refuse
    // and fall the client back to software. That is the lag.
    const hi = path.join(OUT_VIDEO, `${item.out}-2k.mp4`);
    await run(ffmpegPath, [
      '-y', ...trim, '-i', src, '-vf', `scale=-2:${HI_TIER.height}`,
      ...h264(['-crf', String(HI_TIER.crf), '-level', '5.1', hi]),
    ]);
    written.hi = await sizeOf(hi);
  }

  // Poster from the first frame — it is exactly what the viewer sees while
  // the video buffers, so any other frame would flash a jump cut.
  if (POSTERS.has(item.out)) {
    const poster = path.join(OUT_IMAGE, `${item.out}.jpg`);
    await run(ffmpegPath, ['-y', '-i', src, '-vf', 'scale=-2:720', '-frames:v', '1', '-q:v', '6', poster]);
    written.poster = await sizeOf(poster);
  }

  return written;
}

/** What the shipped file actually is, for --check. */
async function probe(file) {
  let out = '';
  try { await run(ffmpegPath, ['-hide_banner', '-i', file]); } catch (e) { out = e.stderr?.toString() || ''; }
  const res = out.match(/, (\d{3,5})x(\d{3,5})/);
  const dur = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return {
    exists: Boolean(res),
    width: res ? +res[1] : 0,
    height: res ? +res[2] : 0,
    seconds: dur ? +(+dur[1] * 3600 + +dur[2] * 60 + +dur[3]).toFixed(2) : 0,
  };
}

async function check() {
  const problems = [];
  for (const item of MANIFEST) {
    const file = path.join(OUT_VIDEO, `${item.out}.mp4`);
    const got = await probe(file);
    if (!got.exists) { problems.push(`${item.out}.mp4 — missing`); continue; }

    const wantH = item.vf
      ? +(item.vf.match(/scale=[-\d]+:(\d+)/)?.[1] ?? 0)
      : (item.height ?? 1080);
    if (wantH && got.height !== wantH) {
      problems.push(`${item.out}.mp4 — ${got.width}x${got.height}, manifest says height ${wantH}`);
    }
    if (item.trim && Math.abs(got.seconds - item.trim) > 0.2) {
      problems.push(`${item.out}.mp4 — ${got.seconds}s, manifest trims to ${item.trim}s`);
    }
    if (item.kind === 'plate') {
      const hi = await probe(path.join(OUT_VIDEO, `${item.out}-2k.mp4`));
      if (!hi.exists) problems.push(`${item.out}-2k.mp4 — missing (2K tier)`);
      else if (Math.abs(hi.seconds - got.seconds) > 0.2) {
        problems.push(`${item.out}-2k.mp4 — ${hi.seconds}s but ${item.out}.mp4 is ${got.seconds}s`);
      }
    }
  }
  console.log(`\nChecked ${MANIFEST.length} declared outputs.`);
  if (!problems.length) console.log('  Everything shipped matches the manifest.\n');
  else { console.log(`  ${problems.length} mismatch(es):`); for (const p of problems) console.log(`    · ${p}`); console.log(); }
  return problems.length;
}

// ── Run ────────────────────────────────────────────────────────────────
await mkdir(OUT_VIDEO, { recursive: true });
await mkdir(OUT_IMAGE, { recursive: true });

if (process.argv.includes('--check')) {
  process.exit((await check()) ? 1 : 0);
}

console.log(`Encoding ${MANIFEST.length} declared outputs…\n`);
const results = [];
for (const item of MANIFEST) {
  process.stdout.write(`  ${item.out.padEnd(20)} … `);
  try {
    const w = await encodeOne(item);
    results.push({ out: item.out, ...w });
    console.log(
      `mp4 ${kb(w.mp4)}`
      + (w.webm ? ` · webm ${kb(w.webm)}` : '')
      + (w.hi ? ` · 2k ${kb(w.hi)}` : '')
      + (w.poster ? ` · poster ${kb(w.poster)}` : '')
    );
  } catch (err) {
    console.log('FAILED');
    console.error(err.stderr?.toString().split('\n').slice(-6).join('\n') || err.message);
  }
}

const sum = (k) => results.reduce((t, r) => t + (r[k] || 0), 0);
console.log(`\n${'─'.repeat(58)}`);
console.log(`  ${results.length} encoded · mp4 ${kb(sum('mp4'))} · webm ${kb(sum('webm'))}`);
console.log(`  2k tier ${kb(sum('hi'))} — only fetched by displays wide enough to show it`);
console.log(`${'─'.repeat(58)}\n`);
