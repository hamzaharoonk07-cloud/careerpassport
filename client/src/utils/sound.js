/**
 * Two short sounds, synthesised with the Web Audio API.
 *
 * No audio files: a chime and a stamp thud are a few oscillator nodes, and
 * shipping two mp3s to play 400ms of sound is not worth the bytes or the
 * loading states. The context is created on first use because browsers refuse
 * to start one before a user gesture, and every call is wrapped — audio is a
 * flourish and must never throw into the UI.
 */
let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq, type = 'sine', start = 0, duration = 0.3, gain = 0.06, slideTo }) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;

  const osc = a.createOscillator();
  const vol = a.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);

  vol.gain.setValueAtTime(0.0001, t);
  vol.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(vol).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Soft two-note chime for the passport opening. */
export function playChime() {
  try {
    tone({ freq: 523.25, duration: 0.5, gain: 0.05 });          // C5
    tone({ freq: 783.99, start: 0.09, duration: 0.6, gain: 0.04 }); // G5
  } catch { /* audio is optional, never fatal */ }
}

/** Low thud plus a short click — a stamp hitting paper. */
export function playStamp() {
  try {
    tone({ freq: 180, type: 'triangle', duration: 0.22, gain: 0.11, slideTo: 60 });
    tone({ freq: 1400, type: 'square', start: 0.005, duration: 0.05, gain: 0.03 });
  } catch { /* audio is optional, never fatal */ }
}
