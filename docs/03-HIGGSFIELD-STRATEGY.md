# 03 — Higgsfield Video Strategy

## 3.1 How we actually connect Higgsfield to this project

Be clear-eyed: **Higgsfield has no Claude Code MCP integration and no drop-in npm SDK.** There are three viable paths, in order of preference.

| Path | How it works | When to use |
|---|---|---|
| **A. Manual generation** *(recommended start)* | I write locked, copy-paste-ready prompt blocks (§3.6). You paste them into higgsfield.ai, generate, download MP4s into `media/higgsfield/raw/`. I handle encode, poster extraction, and integration. | Default. Fastest, full creative control, zero API risk. |
| **B. Browser automation** | I drive higgsfield.ai in your logged-in Chrome via the Claude-in-Chrome tools — paste prompts, pick camera presets, queue generations, collect outputs. | When you want to batch-queue the remaining scenes without babysitting. Needs your session logged in and the extension permitted for the domain. |
| **C. Official API** | If your Higgsfield plan exposes an API key, we wrap it in `tools/higgsfield-batch.js` — reads a JSON job manifest, submits, polls, downloads. | Only if you confirm you have API access. I'll verify the capability exists before writing anything against it — I'm not going to assume an endpoint shape. |

**Recommended sequence:** use **A** for the hero scenes (0, 1, 2, 10) so you control the quality bar by hand, then **B** to batch the remaining eight.

**Videos are assets, not runtime dependencies.** The site must build, run, and demo with placeholder posters even if zero clips exist. This decouples the film production from the engineering track so both can run in parallel.

**Credit budgeting:** assume 12 final clips × ~4 attempts average ≈ **48 generations**, with Scenes 1 and 10 consuming 8–10 attempts each. Generate hero scenes first, while credits are plentiful. If credits run short, Scenes 4, 7 and 9 can degrade to high-quality *stills with CSS parallax* without anyone noticing.

---

## 3.2 Clip breakdown

| # | Scene | Duration | Motion | Quality tier | Web role |
|---|---|---|---|---|---|
| 0 | Confused student | 5s | Very low | High | Hero loop A |
| 1 | Briefcase → value | 5s (2 gens stitched) | Medium | **Highest** | Hero loop B |
| 2 | Passport issued | 5s | Low | High | Section reveal |
| 3 | Career station | 5s | Medium | High | Scroll-scrub |
| 4 | Career metro | 5s | Low | Standard | Scroll-scrub (plate only) |
| 5 | Future roads | 5s | High | High | Scroll-scrub |
| 6 | Match machine | 5s | Medium | High | Scroll-scrub |
| 7 | Skill analysis | 4s | Very low | Standard | Section background |
| 8 | Growth elevator | 5s | Medium | High | Section reveal |
| 9 | Future timeline | 5s | Low, linear | Standard | Scroll-scrub |
| 10 | Result reveal | 5s | Impact | **Highest** | In-app, quiz result |
| 11 | Success journey | 5s | Low | High | Closing section |

**Total runtime ≈ 59s. Total shipped weight target: ≤ 9 MB** across all clips after encoding.

---

## 3.3 Camera language (the film's grammar)

| Move | Means | Scenes |
|---|---|---|
| Push in | Curiosity, entering a world | 0, 2, 6 |
| Crane up / rise | Aspiration, growth | 1, 8 |
| Crane down | Arrival, grounding | 3 |
| Lateral tracking | Surveying options, passage of time | 4, 9 |
| Aerial forward | The leap of decision | 5 |
| Locked + impact | Finality | 10 |
| Pull out | Resolution, release | 11 |

**Rule: no handheld anywhere.** Handheld reads as documentary/startup. We read as luxury institution. Every move is motorised, weighted, slow.

**Rule: lateral moves always match scroll direction.** A left-to-right camera under a downward scroll feels wrong in a way viewers can't articulate but always feel.

---

## 3.4 Lighting, grade, and colour

**Lighting recipe** (baked into the style bible):
> warm golden key light from a low 45° angle, deep navy fill, soft falloff, gentle bloom on gold surfaces, visible volumetric light shaft where the space allows, subtle film grain, shallow depth of field

**Grade / LUT target:**
- Shadows lifted slightly and tinted navy-blue — **never crushed black**
- Midtones warm; skin tones healthy
- Highlights rolled off warm-gold, never clipped white
- Contrast medium-high; saturation restrained — gold and cream carry the colour, everything else desaturates
- **Scene 0 sits ~15% darker than the film average; Scene 11 sits ~20% brighter.** That delta *is* the story.

**Palette locked to the UI — identical hex values:**

```
#060911  Obsidian        #0A1128  Midnight Navy   #0F1B3C  Passport Navy
#3B2A1E  Leather         #C9A227  Gold            #E8C766  Champagne
#F5F0E6  Cream           #EDE6D6  Parchment
```

The video and the CSS must sample the same colours. When the hero video's navy exactly matches `--ink-800`, the frame edge disappears and the video reads as *part of the page* rather than a rectangle embedded in it. This is the cheapest premium trick available.

---

## 3.5 Consistency system — the four locks

This is where most AI-video projects fall apart. Four mechanisms prevent it:

1. **Style Bible suffix.** One fixed paragraph appended verbatim to every single prompt. Never edited mid-project. Not "roughly the same" — *identical characters*.
2. **Image-first workflow.** Never text-to-video directly. Generate a still keyframe first, approve the *frame*, then run image-to-video from it. You approve composition and grade before spending motion credits.
3. **Last-frame chaining.** Export the final frame of Scene N and use it as the input image for Scene N+1 wherever scenes are spatially continuous (2→3, 5→6, 9→10). This produces genuinely seamless cuts that look storyboarded rather than assembled.
4. **Character reference lock.** Scenes 0 and 11 must be the same human. Generate one character portrait reference, save as `media/higgsfield/refs/character-lock.png`, use it as the identity input for both, and generate them back-to-back.

Also locked across the whole film: **16:9**, **24fps**, **1080p master**.

**Rejection criteria — regenerate if you see any of:**
warped hands or faces · legible-but-wrong text · cool or blue-white lighting · plastic CGI surfaces · more than one obvious morph artefact · a camera move that accelerates unevenly (breaks scroll-scrubbing) · anything on the banned list.

---

## 3.6 Prompt system

### STYLE BIBLE — append verbatim to every prompt

> Photorealistic cinematic commercial, shot on ARRI Alexa with anamorphic prime lens, shallow depth of field, warm golden key lighting from low 45 degrees, deep navy shadows, cream and gold colour palette, brushed brass and black leather materials, subtle film grain, volumetric light, luxury corporate advertising aesthetic, understated and elegant, 24fps, 16:9, no text, no logos, no captions.

### NEGATIVE PROMPT — append verbatim to every prompt

> space, galaxy, stars, nebula, sci-fi, futuristic HUD, neon, cyberpunk, holograms, glowing blue tech, cartoon, anime, 3D render look, CGI plastic, fantasy, magic sparkles, floating islands, low quality, blurry, distorted hands, extra fingers, deformed face, watermark, text, subtitles, oversaturated, harsh flash lighting, crowded, cluttered.

### Per-scene subject prompts

Paste **subject + style bible + negative** into Higgsfield for each.

**S0 — Confused student**
> A young university student sitting alone at a dark wooden desk at night, chin resting on hand, staring thoughtfully into the distance, scattered papers and a closed notebook, single warm desk lamp as the only light source, deep navy darkness surrounding, dust motes drifting in the lamp beam, quiet and contemplative mood. Camera: extremely slow dolly in.

**S1a — Briefcase opening**
> A premium black leather briefcase with polished brass hardware resting on dark marble, clasps snapping open, warm golden light spilling out from inside the case. Camera: low three-quarter angle, slow crane up.

**S1b — Value transmutation**
> Golden light and shimmering metallic particles rising out of an open black leather briefcase, particles drifting upward and gathering into a soft rectangular shape of light. Camera: slow push in.

**S2 — Passport issued**
> A deep navy leather passport with gold foil emblem lying on cream textured paper, cover opening on its own, pages fanning slowly, embossed compass rose visible on an inner page, macro detail of paper fibre and gold foil catching moving light. Camera: overhead top-down, slow clockwise rotation.

**S3 — Career station**
> A grand luxury railway station concourse, cream marble floors, tall arched windows, brass fittings, warm evening sunlight streaming through in visible light shafts, a large out-of-focus split-flap departures board in the background, almost empty and serene. Camera: slow crane down from ceiling height to eye level.

**S4 — Career metro**
> A large backlit glass panel mounted on a marble wall showing an abstract network of glowing gold lines and nodes on a deep navy background, warm reflections on the polished floor, shallow depth of field. Camera: slow lateral tracking left to right.

**S5 — Future roads**
> Aerial view at golden hour of three empty roads diverging across a calm green landscape, long warm shadows, a distant city skyline on one horizon, atmospheric haze. Camera: FPV drone slow forward flight, then rising.

**S6 — Match machine**
> Macro shot of a precision brass and glass machine on a dark desk, a blank cream card with embossed texture sliding out of a slot, internal gears turning, warm rim light on the brass. Camera: macro push in with rack focus onto the card.

**S7 — Skill analysis**
> Macro shot of a glass prism on cream textured paper splitting a warm beam of light into distinct bands falling across the page, dark navy surroundings, scientific and elegant. Camera: static, very slow tilt down.

**S8 — Growth elevator**
> Interior of a luxury glass elevator rising through a warm-lit corporate atrium, view outward through the glass at passing floors, brass and dark wood interior, warm light strobing softly as floors pass. Camera: locked inside the car, continuous vertical rise.

**S9 — Future timeline**
> A long sheet of cream textured paper spread across dark polished wood, a thin gold rule running horizontally with small embossed circular markers along it, one blank square outline at the far right end. Camera: slow lateral tracking left to right at constant speed.

**S10 — Result reveal**
> A heavy antique brass stamp descending and pressing firmly onto an open cream passport page, gold dust puffing outward on impact, paper compressing under the weight, the stamp lifting to reveal a deeply embossed ornamental compass-rose seal. Camera: locked macro with a sharp impact shake on contact, then settle.

**S11 — Success journey**
> The same young person, now confident and professional, standing in a bright modern office atrium with morning light through tall windows, mid-stride, holding a slim navy document, warm golden key light, optimistic and composed. Camera: slow dolly out.

---

## 3.7 Post-production pipeline (per clip)

```
raw MP4 (Higgsfield, 1080p)
  ├─ trim to exact beat length; ease in/out on first and last 6 frames
  ├─ colour-match to the LUT reference still
  ├─ export masters:
  │     1080p H.264 (baseline compatibility)
  │     1080p AV1/WebM (modern browsers, ~40% smaller)
  │     720p  H.264 (mobile)
  │     scrub variant: keyframe interval = 1 (only for scenes 3,4,5,6,9)
  ├─ extract poster frame → AVIF + WebP + JPEG fallback
  ├─ strip the audio track entirely (autoplay requirement)
  └─ name: s03-career-station.1080p.mp4 / .webm / .avif
```

Tooling: `ffmpeg` for all of it, wrapped in `tools/encode-media.sh` so re-encoding the whole set is one command. Scrub variants are large (all-keyframe) — keep them 720p and only for the five scrubbed scenes.

**Asset directory:**

```
media/higgsfield/
  refs/            character-lock.png, lut-reference.png, keyframes/
  raw/             untouched Higgsfield downloads (gitignored, large)
  masters/         trimmed + graded 1080p
  web/             final encoded mp4/webm/avif that ship in the build
  prompts.json     the exact prompt used for every generation, for reproducibility
```

`prompts.json` matters more than it looks: when a clip needs regenerating in week 3, you regenerate it *identically* instead of guessing.
