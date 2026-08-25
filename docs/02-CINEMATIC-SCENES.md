# 02 — Cinematic Landing Page Experience

## Structural model

The landing page is a **12-beat scroll film**.

- Beats **0–1** = the hero (autoplay loop, above the fold)
- Beats **2–7** = a scroll-scrubbed pinned sequence
- Beats **8–11** = section-triggered clips embedded inside real UI

The film never blocks the product: a persistent `Skip to app →` pill sits top-right from the first pixel, and a gold chapter rail on the left lets a judge jump straight to any beat.

### Global rules for every scene

- Aspect **16:9 master**, subject composed inside the centre 60% so a mobile 9:16 centre-crop never decapitates anyone
- Colour graded to the same LUT (see `03-HIGGSFIELD-STRATEGY.md` §3.4)
- **No text baked into video** — all text is DOM, so it stays selectable, translatable, accessible, and data-driven
- Every clip ships a poster frame in AVIF/WebP for instant first paint
- Every clip is silent; sound effects are separate and only play after a user gesture

---

## SCENE 0 — "The Weight of Not Knowing"

| | |
|---|---|
| **Purpose** | Establish the problem in one frame. Earn empathy before we sell anything. |
| **User emotion** | Recognition, quiet ache — *"that's me."* |
| **Visual concept** | A young student at a dark wooden desk at night, lit by a single warm desk lamp. Scattered papers, an untouched notebook, laptop glow on their face. Chin on hand, staring past the camera. Warm pool of light; deep navy shadow fills the rest of the frame. |
| **Camera** | Extremely slow push-in (dolly in), ~5% over 5 seconds. Almost imperceptible — creates unease without drama. |
| **Animation style** | Photoreal live-action. Film grain, shallow depth of field (f/1.8 look), dust motes drifting in the lamp beam. |
| **Transition** | The lamp light *warms and intensifies*, blooming to gold. Pure luminance transition — no wipe, no cut. |
| **Connects to next** | The gold bloom becomes the reflection on the briefcase's brass clasp. |
| **Higgsfield requirement** | 5s, image-to-video from an approved keyframe. Camera preset: `Dolly In` at slowest setting. Motion budget spent on light, not the person. |

**DOM overlay:** headline fades in at 1.2s — *"Not everyone knows what's next."* Subline 2.0s. Scroll cue 3.5s. Text sits in the dark right-hand third of the frame, never over the subject.

---

## SCENE 1 — "The Briefcase / What Your Future Is Worth"

| | |
|---|---|
| **Purpose** | Transform anxiety into value. A career is not a job title — it is compounding worth. |
| **User emotion** | Intrigue → aspiration. First dopamine hit. |
| **Visual concept** | A premium black leather briefcase on dark marble, gold hardware. Clasps snap open; interior glows warm gold. Light lifts out and **transmutes** — coin glints dissolve upward into gold particles that resolve into small floating glyphs: a wrench, a stethoscope, a code bracket, a paintbrush, a graduation cap. |
| **Camera** | Low three-quarter angle, slow crane up as the case opens, then a gentle push toward the interior glow. |
| **Animation style** | Photoreal product-commercial. Particle transmutation must read as *light and dust*, not videogame VFX. Money implied by glint and texture — never a cartoon dollar sign. |
| **Transition** | Particles converge into a rectangle — a passport shape forming out of gold light. |
| **Connects to next** | That rectangle *is* the passport in Scene 2. |
| **Higgsfield requirement** | 5s, likely **two generations stitched**: (a) briefcase opening, (b) particle-to-glyph transmutation. Presets: `Crane Up` → `Push In`. Highest quality tier — this is the hero clip and earns the budget. |

**DOM overlay:** three value counters animate up alongside — *Avg. starting salary · 5-yr growth · Open roles* — pulled from real seeded MongoDB data, not invented numbers. Judges check this kind of thing.

---

## SCENE 2 — "The Passport Is Issued"

| | |
|---|---|
| **Purpose** | Introduce the product metaphor. The brand's logo moment. |
| **User emotion** | Ownership. *"That's mine."* |
| **Visual concept** | A deep navy leather passport, gold foil emblem, resting on cream paper. It opens itself; pages fan. Inside, blank stamp-slots wait. One page carries an embossed compass rose. |
| **Camera** | Top-down locked shot with a slow 8° clockwise drift. Overhead makes it feel like a document being *presented to you*. |
| **Animation style** | Photoreal macro. Paper fibre visible; gold foil catches a moving light source. |
| **Transition** | Camera dives *into* the open page; paper texture fills frame and dissolves into the marble floor of the station. |
| **Connects to next** | Scale flip — the intimate object becomes a vast architectural space. Maximum contrast = maximum impact. |
| **Higgsfield requirement** | 5s. Preset: `Overhead / Top-down` with slow rotation, ending `Push In` for the dive. **Last frame must be near-white/cream** so the cross-dissolve into Scene 3 is clean. |

---

## SCENE 3 — "Career Station"

| | |
|---|---|
| **Purpose** | Reframe careers as *destinations you can travel to*, not terrifying permanent commitments. |
| **User emotion** | Awe, then orientation. The world is big — but it has a map. |
| **Visual concept** | A luxury railway concourse: cream marble, brass fittings, tall arched windows with warm evening light shafting through. A split-flap departures board reads career fields — ENGINEERING, MEDICINE, DESIGN, DATA, FINANCE, EDUCATION. Elegant, sparse, no crowd chaos. |
| **Camera** | Wide establishing; slow crane down from ceiling height to eye level, ending facing the board. |
| **Animation style** | Photoreal architectural cinematography. Volumetric light shafts with real dust in the beams. |
| **Transition** | The split-flap board clatters through a flip cycle; on the last flip the letters resolve into a metro line diagram. |
| **Connects to next** | Board → map. Information architecture is literally revealed. |
| **Higgsfield requirement** | 5s. Preset: `Crane Down` / `Dolly In`. **Text warning:** AI video mangles small text — generate the board deliberately *out of focus* and overlay real destination names as an animated DOM/SVG split-flap. Bonus: it becomes live MongoDB data. |

---

## SCENE 4 — "Career Metro"

| | |
|---|---|
| **Purpose** | Show that fields interconnect — switching is possible, skills transfer. |
| **User emotion** | Relief. *"I'm not locking myself in forever."* |
| **Visual concept** | An illuminated metro map in gold and cream on deep navy, physically present as a backlit glass panel in the station. Lines are career families; interchange stations are transferable skills (Communication, Analysis, Design Thinking). A light pulse travels one route. |
| **Camera** | Slow lateral tracking left→right across the panel, shallow depth so the near edge blurs. |
| **Animation style** | **Hybrid** — photoreal glass and reflections in the video, but the map lines themselves are **SVG in the DOM**, animated with `stroke-dashoffset` draw-on and fully hoverable. Cinematic base, interactive foreground. |
| **Transition** | Camera pushes into a single interchange node; light floods; we emerge outdoors. |
| **Connects to next** | One node = one decision point = the fork in the road. |
| **Higgsfield requirement** | 5s of the station-panel plate only, no legible text. 720p is sufficient since the SVG carries all detail. Preset: `Dolly Left` / tracking. |

---

## SCENE 5 — "Choose Your Future Road"

| | |
|---|---|
| **Purpose** | Dramatise the moment of choice. Make the fork feel powerful, not paralysing. |
| **User emotion** | Agency. The first "I could pick" feeling. |
| **Visual concept** | Golden-hour aerial over three roads diverging through a calm landscape, each leading toward a different distant silhouette — a city skyline, a research campus, a creative studio district. Long shadows, cinematic haze. |
| **Camera** | FPV drone forward flight, then a slow rise revealing all three branches at once. |
| **Animation style** | Photoreal aerial cinematography, anamorphic feel, gentle motion. |
| **Transition** | The roads' three vanishing points converge into three glowing cards that snap into frame. |
| **Connects to next** | Roads → cards → the machine that deals them. |
| **Higgsfield requirement** | 5s. Preset: `FPV Drone` or `Crane Up`. Keep it grounded and real — no fantasy landscape, no floating islands. |

**DOM overlay:** three interactive route cards ride on rails; hovering one dims the others and shifts the video's grade via a CSS `filter` transition.

---

## SCENE 6 — "Career Match"

| | |
|---|---|
| **Purpose** | Reveal the mechanism. Show there is *a system*, not a horoscope. |
| **User emotion** | Trust through transparency. |
| **Visual concept** | A precision brass-and-glass machine on a dark desk — a Swiss watch crossed with a passport-control terminal. A cream card slides in; mechanisms turn; the card emerges gold-edged and embossed. |
| **Camera** | Macro push-in on the card slot, then a rack-focus to the emerging card. |
| **Animation style** | Photoreal macro product. Mechanical, tactile, satisfying. A soft mechanical *thunk* in sound design — muted by default, available on a user toggle. |
| **Transition** | The card's surface fills frame; the emboss lines become data bars. |
| **Connects to next** | The card's content is explained by the skill analysis. |
| **Higgsfield requirement** | 5s macro. Preset: `Crash Zoom In` (softened) or macro `Push In`. Card face must be generated **blank / emboss-texture only** — the actual career name is DOM text so it can display the user's real result. |

---

## SCENE 7 — "Skill Analysis"

| | |
|---|---|
| **Purpose** | Prove the recommendation is explainable. The credibility scene. |
| **User emotion** | Being understood in detail. |
| **Visual concept** | Light passes through a glass prism onto cream paper, splitting into bands. Each band settles onto the page as a measured line — an analogue rendering of a chart. Warm and scientific, never sci-fi. |
| **Camera** | Static locked-off with a very slow tilt down onto the paper. |
| **Animation style** | Photoreal macro plus real optics. **The chart is not in the video** — it is a Recharts/SVG radar that draws on in the DOM, aligned to the video's light bands. |
| **Transition** | The chart's tallest bar extends upward and becomes an elevator shaft of light. |
| **Connects to next** | Strength → growth. |
| **Higgsfield requirement** | 4–5s. Preset: `Tilt Down` or fully static. Low motion budget = cheap generation, high polish. |

---

## SCENE 8 — "Career Growth Elevator"

| | |
|---|---|
| **Purpose** | Compress a decade of progression into five seconds. |
| **User emotion** | Momentum, ambition. |
| **Visual concept** | Interior of a luxury glass elevator rising through a warm-lit corporate atrium. Through the glass, each floor shows a stage: *Learning → Internship → Junior → Senior → Leadership.* The floor indicator climbs. |
| **Camera** | Locked inside the car, looking out — continuous vertical rise. The world moves; the camera doesn't. |
| **Animation style** | Photoreal architectural. Light strobes warmly as floors pass. |
| **Transition** | Doors open onto white light which resolves into a horizontal timeline. |
| **Connects to next** | Vertical growth becomes horizontal time. |
| **Higgsfield requirement** | 5s. Preset: `Crane Up` / vertical dolly. Floor labels are DOM overlays pinned to scroll position so they scrub with the user. |

---

## SCENE 9 — "Future Timeline"

| | |
|---|---|
| **Purpose** | Make the future concrete and dated. Ambition needs a calendar. |
| **User emotion** | Planning mindset. *"Year 1 is doable."* |
| **Visual concept** | A long cream paper spread on dark wood, a gold rule running left to right, embossed milestone markers along it. No hands — the page moves itself. |
| **Camera** | Slow lateral tracking left→right, matching scroll direction. |
| **Animation style** | Photoreal macro paper. DOM overlays year markers, salary bands, and certifications sourced from the career record in MongoDB. |
| **Transition** | The camera reaches the timeline's end where a blank stamp box waits — and holds. Anticipation. |
| **Connects to next** | The empty box demands to be filled. That's the reveal. |
| **Higgsfield requirement** | 5s horizontal tracking. Preset: `Dolly Right`. This clip is **scroll-scrubbed**, so it must be generated at a *constant* motion rate — uneven acceleration makes scrubbing feel broken. |

---

## SCENE 10 — "Career Result Reveal" ⭐ THE WOW MOMENT

| | |
|---|---|
| **Purpose** | The payoff. The ceremony. The screenshot everyone shares. |
| **User emotion** | Pride. Goosebumps. Completion. |
| **Visual concept** | The passport lies open. A heavy brass stamp descends and **presses**. Impact: gold dust puffs, paper compresses, ink sets. The stamp lifts, revealing a deeply embossed seal. |
| **Camera** | Locked medium macro with a real **impact shake** on contact (2–3 frames), then settle. |
| **Animation style** | Photoreal with weight. The single most important quality: *the stamp must feel HEAVY.* Slow descent, hard stop, dust, micro-bounce. |
| **Transition** | Not a transition — a full stop. Video freezes on the stamped page and the DOM takes over completely. |
| **Connects to next** | From "here's your result" to "here's who you become." |
| **Higgsfield requirement** | 5s, **highest quality tier, expect 5–10 regenerations.** Preset: static + impact/shake. The stamp face must be generic ornamental (a compass-rose seal), never a specific career name — the name is DOM text layered in perspective over the stamped area with a CSS transform. |

**Engineering note:** pair the video freeze-frame with a canvas-rendered shockwave and a 40ms haptic on mobile (`navigator.vibrate(40)`). Small detail, enormous impact. Full choreography in `04-MOTION-DESIGN.md` §4.10.

---

## SCENE 11 — "Success Journey"

| | |
|---|---|
| **Purpose** | Close the emotional loop opened in Scene 0. Same person, transformed. |
| **User emotion** | Belief. *"That could be me."* |
| **Visual concept** | **Deliberate visual rhyme with Scene 0** — same lighting temperature, same framing, but now the same person stands in a bright professional environment, confident, mid-stride, slim navy document in hand. Scene 0's desk lamp is echoed by a window of morning light. |
| **Camera** | Slow pull-back (dolly out) — the exact mirror of Scene 0's push-in. The visual grammar completes the sentence. |
| **Animation style** | Photoreal, brighter grade, cooler highlights but the same gold key light. **Same actor identity is essential.** |
| **Transition** | Pull back until the frame becomes a card in the Success Stories rail. |
| **Connects to next** | The closing CTA — *"Get your passport stamped."* |
| **Higgsfield requirement** | 5s. Preset: `Dolly Out`. Must reuse the Scene 0 character reference for identity continuity — the hardest consistency requirement in the film and the most rewarding if we land it. Generate this **immediately after Scene 0**, while the reference is fresh. |
