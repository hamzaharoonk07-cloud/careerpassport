# 04 — Website Motion Design Plan

## 4.1 Motion principles

1. **Physics, not linear.** Default easing `cubic-bezier(0.22, 1, 0.36, 1)` (expo-out) for entrances; `cubic-bezier(0.65, 0, 0.35, 1)` for state changes.
2. **Duration ladder — four values, nothing else:** micro `120ms` · standard `320ms` · emphasis `600ms` · cinematic `1200ms`.
3. **Compositor only.** Animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`, or `box-shadow` in a loop.
4. **Stagger, don't swarm.** Lists reveal at 60ms intervals, capped at 8 items — beyond that, fade the group as one.
5. **One hero motion per viewport.** If two things demand attention at once, the design is wrong.
6. **Reduced motion is a first-class design,** not a disabled state: videos become graded stills, parallax becomes static, reveals become instant opacity.

---

## 4.2 Page transitions

- **Route change:** a navy curtain wipe with a gold hairline edge sweeps up, holds 180ms, sweeps out — 700ms total. The compass emblem sits centre during the hold.
- **Shared element:** clicking a career card morphs it into the detail-page header (FLIP via Framer Motion `layoutId`). This single effect does more for perceived polish than any other.
- **Back navigation reverses the wipe direction.** Direction encodes hierarchy — users feel it without noticing it.
- Transitions never exceed 700ms. A judge clicking through 12 pages must never wait on our theatre.

---

## 4.3 Scroll animations

- **Smooth scroll** via Lenis, `lerp: 0.09`. **Disabled on touch devices** — native momentum beats any JS emulation.
- **Scroll-scrubbed video** for scenes 3–7 and 9: GSAP ScrollTrigger maps scroll progress → `video.currentTime`. Requires the all-keyframe scrub encode. Desktop ≥1024px only.
- **Pinned sequences:** each cinematic beat pins for ~120vh of scroll; DOM text cross-fades across three sub-states inside the pin.
- **Parallax:** background video 0.15× scroll speed, mid content 1×, foreground accents 1.25×. **Three layers maximum.**
- **Reveal-on-enter:** `y: 32px → 0`, `opacity: 0 → 1`, 600ms, triggered at 15% viewport entry, `once: true`.
- **Chapter rail:** a thin gold line down the left edge fills with scroll progress; hovering reveals scene names and jumps on click. This is an escape hatch for impatient evaluators and it also *shows off* that the page is a structured film.
- **Counters:** salary and growth figures count up once on entry with an ease-out curve, `tabular-nums` so digits don't jitter.

---

## 4.4 Hover effects

| Element | Effect | Duration |
|---|---|---|
| Primary button | Gold fill wipes in from left (`scaleX`) behind the label; label colour crossfades navy→cream | 220ms |
| Card | Lift `translateY(-6px)`, shadow deepens, gold hairline draws from the top-left corner around the perimeter (SVG `stroke-dashoffset`) | 400ms |
| Career card | Poster image scales 1.06 inside `overflow:hidden`; a "stamp" watermark fades to 8% opacity | 400ms |
| Nav link | Underline grows from centre, gold | 180ms |
| Metro node | Highlights the full route, dims all others to 25% | 300ms |
| Primary CTA | Magnetic cursor — button translates up to 6px toward the pointer | continuous |

Magnetic cursor is **desktop and fine-pointer only** (`@media (hover: hover) and (pointer: fine)`). On touch it is dead weight.

---

## 4.5 Button animations

| State | Behaviour |
|---|---|
| Rest → hover | Gold fill wipe (above) |
| Press | `scale(0.97)`, 90ms |
| Loading | Label slides up and out; a gold three-dot pulse slides in. **Button width is locked beforehand** so nothing reflows |
| Success | Dots collapse into a checkmark that draws in via `stroke-dashoffset`, then settles to a subdued success state for 1.2s |
| Disabled | 40% opacity, no pointer events, no motion |

---

## 4.6 Loading animations

- **App boot:** a passport cover on navy; the gold emblem draws itself (SVG path, 900ms); the cover flips open; content fades through. **Hard-capped at 1.6s** — if assets aren't ready we show the app anyway and stream the rest. A pretty loader that outstays its welcome becomes a bad loader.
- **Route loading:** a 2px gold progress bar pinned to the top of the viewport.
- **Data loading:** skeletons in parchment tone with a slow gold shimmer sweep on a **2.4s cycle**. Slow shimmer reads as premium; fast shimmer reads as cheap. This is a real perceptual difference.
- **Quiz submission:** the match-machine micro-animation — card slides into a slot, gears turn — with a **2.5s minimum hold**. Intentionally not instant: ceremony requires time, and real API latency hides inside it.
- **Video buffering:** the poster stays visible with a subtle gold pulse. **Never a spinner over cinematic content.**

---

## 4.7 Card animations

- **Entrance:** staggered 60ms, `y: 24 → 0`, opacity, scale from 0.98
- **Filter change:** FLIP re-layout over 400ms — cards *slide* to new positions rather than popping. This is the difference between a filter feeling like a database query and feeling like a physical rearrangement.
- **Quick view:** the card rotates 180° on the Y axis revealing key stats on the back (`transform-style: preserve-3d`, 600ms)
- **Bookmark:** a small gold stamp thuds onto the card corner with a 3-frame scale overshoot

---

## 4.8 Dashboard animations

- Widgets cascade in on mount, 80ms stagger, top-left → bottom-right
- Charts draw on over 900ms `ease-out`; on data change they **tween between states, never re-mount**
- The passport-progress widget: stamp slots fill with an ink-set animation as milestones complete
- Number tiles count up **on first view only** (session-flagged). Re-counting on every visit is annoying, not premium
- Sidebar collapse: width 280→72px over 280ms; labels fade at 120ms so text never squashes mid-transition

---

## 4.9 Quiz animations

- **One question per screen.** Outgoing slides left + fades; incoming slides in from the right; 380ms. Direction reverses on Back.
- **Progress = a metro line** across the top, with a train icon advancing between stations — one station per question. This is the metaphor's best payoff and it makes a 25-question quiz feel like a journey instead of a form.
- **Answer selection:** the option card gets a gold border draw, a soft inner glow, and a 90ms scale pulse; the other options desaturate to 60%.
- **Auto-advance 450ms after selection** — long enough to register the choice, short enough to feel fast. Always overridable via Next.
- **Section change:** a full "passport control" interstitial — *"Section 2 of 4: Work Style"* — with a stamp thud. 1.4s, skippable.
- **Final question → submit:** the train arrives at the terminus, doors open, and we transition into the match machine.

---

## 4.10 Career recommendation reveal — the set piece

Choreographed timeline, ~6.5s, fully skippable via a persistent `Skip animation` control (and auto-skipped for returning users who've seen it once).

```
0.0s  Screen darkens to obsidian; everything else fades out
0.3s  Passport slides up from the bottom edge, closed, slight rotation
1.0s  Cover opens (3D rotateY); pages settle with a paper flutter
1.8s  Scene 10 video plays — brass stamp descends
2.6s  IMPACT — screen shake (4px, 3 frames), gold dust burst on canvas,
      haptic pulse on mobile, page whitens 8% for 2 frames
2.9s  Stamp lifts. Video freezes. DOM takes over.
3.2s  Career title types in, 40ms per character
4.0s  Match % counts 0 → N, ease-out; a gold ring sweeps around it
4.6s  Four skill bars fill, 80ms stagger
5.2s  Salary band slides in from the right
5.8s  Roadmap cards deal out like playing cards, 100ms stagger
6.3s  Primary CTA fades up — "Add to My Passport"
6.5s  Gold dust settles.
```

**No confetti.** Confetti is a party; this is an institution. Gold dust settling is the same dopamine with ten times the class.

---

## 4.11 Performance guardrails for motion

- Budget: **≤ 3 concurrently animating elements** in any viewport at any time
- `will-change` is applied *on interaction start* and removed on completion — never left in CSS permanently (it permanently allocates GPU layers and will tank a low-end phone)
- All ScrollTriggers are killed on route unmount; GSAP contexts are scoped with `gsap.context()` and reverted in the cleanup function
- Long scroll sections use `content-visibility: auto` with a `contain-intrinsic-size` hint
- Target: **60fps sustained** on a mid-range Android in Chrome DevTools' 4× CPU throttle. If a section can't hold it, the section loses an effect — not the frame rate.
