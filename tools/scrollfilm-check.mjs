/**
 * ScrollFilm mapping check.
 *
 * The scrub cannot be verified in an automated browser tab: Chrome defers
 * media loading for hidden documents, so `readyState` never leaves 0 there.
 * What can be verified is the arithmetic the component runs every frame —
 * scroll position → progress → currentTime → chapter index.
 *
 * These assertions mirror ScrollFilm.jsx exactly. If that file's formulas
 * change, this must change with it.
 */
import assert from 'node:assert/strict';

const DURATION = 15.08;          // journey.mp4, from ffprobe
const VIEWPORT = 900;
const SECTION = VIEWPORT * 6.2;  // height="620vh" on desktop
const SCROLLABLE = SECTION - VIEWPORT;

const CHAPTERS = [
  { at: 0,    title: 'Hero' },
  { at: 0.16, title: 'Terminal' },
  { at: 0.34, title: 'Boarding pass' },
  { at: 0.52, title: 'Departure' },
  { at: 0.68, title: 'En route' },
  { at: 0.82, title: 'Arrival' },
  { at: 0.93, title: 'Passport' },
];

// Component: progress = clamp(-rect.top / scrollable)
const progressAt = (scrolled) =>
  Math.min(1, Math.max(0, scrolled / SCROLLABLE));

// Component: reduce keeping the last chapter whose `at` we have passed
const chapterAt = (p) =>
  CHAPTERS.reduce((acc, c, idx) => (p >= c.at ? idx : acc), 0);

let checks = 0;
const ok = (label, fn) => { fn(); checks += 1; console.log(`  ok  ${label}`); };

ok('progress clamps below the section', () => {
  assert.equal(progressAt(-500), 0);
});
ok('progress clamps past the section', () => {
  assert.equal(progressAt(SCROLLABLE + 999), 1);
});
ok('progress is linear through the middle', () => {
  assert.ok(Math.abs(progressAt(SCROLLABLE / 2) - 0.5) < 1e-9);
});

ok('every chapter is reachable', () => {
  const seen = new Set();
  for (let s = 0; s <= SCROLLABLE; s += 5) seen.add(chapterAt(progressAt(s)));
  assert.deepEqual([...seen].sort((a, b) => a - b), CHAPTERS.map((_, i) => i),
    'a chapter can never be shown — its `at` is unreachable');
});

ok('chapters advance monotonically', () => {
  let prev = 0;
  for (let s = 0; s <= SCROLLABLE; s += 5) {
    const i = chapterAt(progressAt(s));
    assert.ok(i >= prev, `chapter went backwards while scrolling down at ${s}px`);
    prev = i;
  }
  assert.equal(prev, CHAPTERS.length - 1, 'the last chapter is never reached');
});

ok('chapter boundaries land on their own timestamps', () => {
  CHAPTERS.forEach((c, i) => {
    assert.equal(chapterAt(c.at), i, `chapter ${i} does not activate at its own \`at\``);
  });
});

ok('the whole clip is covered', () => {
  assert.ok(Math.abs(progressAt(SCROLLABLE) * DURATION - DURATION) < 1e-9,
    'scrolling to the end does not reach the last frame');
});

ok('the easing converges', () => {
  // current += (target - current) * 0.12, run at 60fps
  let current = 0;
  for (let f = 0; f < 120; f += 1) current += (1 - current) * 0.12;
  assert.ok(current > 0.999, `eased value stalled at ${current.toFixed(4)}`);
});

ok('a wheel notch stays inside one keyframe interval per frame', () => {
  // What the decoder actually sees is the *eased* step, not the raw jump.
  // -g 6 at 24fps puts a keyframe every 0.25s; a per-frame seek shorter than
  // that lands within the same GOP and decodes without a visible hitch.
  const notch = (100 / SCROLLABLE) * DURATION;   // one wheel event
  const firstFrame = notch * 0.12;               // the largest eased step it causes
  assert.ok(firstFrame < 0.25,
    `a wheel notch seeks ${firstFrame.toFixed(3)}s in one frame, past a keyframe`);
});

ok('a full-page jump settles without oscillating', () => {
  // Dragging the scrollbar top to bottom is the worst case. It seeks far on
  // the first frame - unavoidable - but must converge, and never overshoot.
  let current = 0;
  let worst = 0;
  for (let f = 0; f < 90; f += 1) {
    const step = (1 - current) * 0.12;
    worst = Math.max(worst, step * DURATION);
    current += step;
    assert.ok(current <= 1, 'the eased value overshot the target');
  }
  assert.ok(current > 0.99, 'a full jump never settles');
  assert.ok(worst < DURATION * 0.13, `first seek of ${worst.toFixed(2)}s is too large`);
});

/* ── The phone track ─────────────────────────────────────────────
   Phones scrub the same film over a shorter track (420vh) at a smaller
   viewport, so the per-frame seek must be re-checked: a shorter track
   makes each pixel of scroll worth more video. */
const MOB_VH = 720;
const MOB_SCROLL = MOB_VH * 4.2 - MOB_VH;

ok('a phone swipe stays inside one keyframe interval per frame', () => {
  // A thumb flick moves far more than a wheel notch - call it 300px.
  const swipe = (300 / MOB_SCROLL) * DURATION;
  const firstFrame = swipe * 0.12;
  assert.ok(firstFrame < 0.25,
    `a swipe seeks ${firstFrame.toFixed(3)}s in one frame, past a keyframe`);
});

ok('every chapter is still reachable on the phone track', () => {
  const seen = new Set();
  for (let p = 0; p <= 1; p += 0.002) seen.add(chapterAt(p));
  assert.equal(seen.size, CHAPTERS.length, 'a chapter is unreachable on mobile');
});

console.log(`\n${checks} checks passed.`);
