# Scroll-scrubbed journey scene — Higgsfield prompt

One continuous clip covering the whole story: terminal → gate → takeoff →
cruise → landing. Driven by scroll position rather than played, so the visitor
scrubs the flight as they read the page.

**Model:** `minimax_h3` · **Duration:** 15s · **Resolution:** 2K · **Aspect:** 16:9
**Cost:** 60 credits

> Seedance 2.5 would allow 20–30s but costs 180 credits at 1080p — more than
> the current balance. MiniMax gives 15s at higher resolution for a third of it,
> and 15s is a full page-scroll's worth of footage.

---

## The prompt

```
One single unbroken continuous camera shot, no cuts, no edits, no transitions,
filmed as one take at a constant unchanging speed from first frame to last.

The camera begins inside a warm sandstone airport terminal at golden hour,
Pakistani architecture with traditional Islamic geometric screens and polished
patterned marble floors, and glides steadily forward toward the tall windows.
It passes through the glass onto the apron where a white Emirates Airbus A380
with its red and green tail waits at the jet bridge. The camera continues
forward without pausing, rising smoothly alongside the fuselage, then lifts and
follows the aircraft as it rolls, rotates and climbs off the runway. It stays
with the aircraft as it ascends through low cloud into a deep blue sky above a
golden sunlit cloud layer at high altitude, then descends with it through the
clouds toward a distant lit terminal at dawn, finishing as the wheels touch the
runway and the aircraft rolls away from camera into the warm light.

The camera never stops, never speeds up, never slows down, and never cuts.
Constant linear velocity throughout, smooth steady gimbal motion, no handheld
shake, no whip pans, no zoom punches.

Photorealistic cinematic commercial, shot on ARRI Alexa with anamorphic prime
lens, warm golden key light, deep navy shadows, cream and gold palette, subtle
film grain, volumetric light, luxury travel advertising aesthetic, 16:9.
No text, no captions, no titles, no on-screen graphics, no logos other than the
aircraft livery.
```

---

## Why it is written that way

**The repetition about speed is deliberate.** Scroll-scrubbing hands the
timeline to the user's finger. Any acceleration the model builds in reads as a
jolt when scrubbed, and a cut reads as the video being broken. Saying "constant
velocity, no cuts" three different ways is what actually holds the model to it.

**The beats map to the page.** Terminal covers the departures board, the gate
covers the boarding pass, takeoff covers the quiz, cruise covers the analysis,
landing covers the result — so section headings can be pinned to timestamps.

**"No text" is repeated too**, because generated signage comes out as garbled
pseudo-lettering and a judge will zoom in on it.

## Start frame

Use the approved Karachi terminal keyframe as `start_image` so this clip matches
the rest of the footage rather than inventing a new terminal:

```
media/higgsfield/keyframes/khi1-hall.png
job id: 9bfe8785-8686-4872-8f92-691ae44a0c27
```

## After generating

```bash
node tools/encode-media.mjs
```

Writes `client/public/videos/journey.mp4` + `.webm` and a poster. Then it needs
a scroll-scrub component: a `<video>` with `preload="auto"`, paused, whose
`currentTime` is set from scroll progress inside a `requestAnimationFrame` —
never from the scroll event directly, or it stutters. Desktop only; mobile
falls back to autoplay-on-enter, because iOS will not scrub a video reliably.
