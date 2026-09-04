# PathSeeker — Career Passport

A career discovery platform built as a guided cinematic experience. A confused
student walks in; an explainable career match, a skills gap and a six-stage
roadmap walk out.

**Stack:** MongoDB · Express 5 · React 18 · Node 24 — plus a custom CSS design
system. No UI framework, no animation library.

---

## Quick start

```bash
npm install          # installs client + server workspaces
npm run dev          # starts the API on :5000 and the client on :5273
```

Open **http://localhost:5273**.

There is no database to install. With `MONGO_URI` empty, the server boots a real
`mongod` in memory and seeds it automatically on first run (the initial binary
download is ~600 MB and happens once).

**Demo account:** `demo@pathseeker.app` / `demo1234`

### Pointing at a real database

Put an Atlas connection string in `server/.env`:

```
MONGO_URI=mongodb+srv://…
```

Then seed it explicitly — the automatic seed only ever touches the in-memory
database, so a real cluster is never wiped by accident:

```bash
npm run seed
```

---

## The journey

```
Landing → Register / Login → Passport + VERIFIED stamp → Terminal
   → Departures board → Field selection → Quiz → Analysis → Result
   → Roadmap → Dashboard
```

Every stage is skippable, resumable, and survives a page refresh — journey
progress is written to both `localStorage` and the user document.

---

## How the matching actually works

Deterministic, explainable, and defensible under questioning. No ML, no external
API, nothing random.

```
score = 0.60 × RIASEC cosine similarity
      + 0.30 × field affinity from the quiz
      + 0.10 × the field the user chose at the gate
```

Each of the 180 quiz options carries two vectors: **field weights** (which of the
six fields it points at) and a **Holland/RIASEC vector** (Realistic,
Investigative, Artistic, Social, Enterprising, Conventional). Each of the 38
careers carries its own RIASEC vector. Matching is cosine similarity between the
two.

Two details that matter:

- **Axis normalisation.** The question bank does not offer equal weight to every
  axis — Realistic tops out around 20 points while Investigative reaches 44.
  Each axis is divided by what was actually reachable, so a hands-on career is
  not permanently disadvantaged.
- **Cosine rescaling.** Two all-positive six-dimensional vectors rarely score
  below ~0.55, which compresses every career into a narrow band. The usable
  range is rescaled onto 0–1 so differences between careers are visible.

Every match returns `reasons[]` — sentences generated from the numbers that
actually moved the score, e.g. *"Your two strongest traits — Realistic and
Investigative — are exactly the pair this role is built on."*

**Work-style fit is deliberately not scored.** The original plan included it,
but this quiz never asks about work style, and scoring against data we do not
collect would be inventing a number. It is shown on career pages as
information only.

---

## On the data

The 38 careers are seeded with skills, learning areas, six-stage roadmaps,
demand levels and salary bands.

> **The salary figures are indicative estimates, not sourced data.** Every one
> carries `source: "Indicative range for Pakistan, 2025 — verify against current
> local market data"`, and the UI prints that caveat under the figure. Replace
> them with verified figures before this is put in front of real users.

Three careers (`industrial-designer`, `entrepreneur-founder`,
`filmmaker-director`) have `salary: null` on purpose. The API reports
`hasSalaryData: false` and the UI renders **"Information not available."** —
the app never estimates a number it does not hold.

---

## Project structure

```
client/
  src/
    components/   primitives · brand · motion · media · layout
    context/      AuthContext · JourneyContext
    hooks/        useReveal · useCountUp · useTypewriter · useReducedMotion
                  useRecentlyViewed · useHiResVideo
    pages/        18 route components
    services/     api (axios + silent refresh) · career · quiz
    styles/       tokens · global · forms · motion · a11y · passport · quiz · app
                  airport · dashboard · destination · hub · account · admin · print

server/
  src/
    config/       env · db
    models/       User · CareerField · Career · QuizQuestion · QuizOption
                  QuizAnswer · QuizResult · SavedCareer · MediaItem
                  SuccessStory · Feedback
    controllers/  auth · user · career · quiz · savedCareer · public
                  admin · resume · photo · mediaUpload
    services/     recommendation.service.js   ← the engine
    middleware/   auth · validate · rateLimit · errorHandler
    validators/   zod schemas
    seed/         careerFields · careers.part1/2 · questions · stories
                  media · seed.js
  tests/
```

## API

| Group | Routes |
|---|---|
| `/api/auth` | `register` `login` `logout` `refresh` `me` |
| `/api/users` | `me` `me/journey` `me/field` |
| `/api/careers` | list (search · field · skill · paging) · `:id` · `skills` |
| `/api/career-fields` | list |
| `/api/quiz` | questions · `submit` |
| `/api/results` | `me` · `me/all` · `:id` |
| `/api/saved-careers` | list · save · unsave |
| `/api/media` | list · `POST` submit (moderated) |
| `/api/stories` | list · `POST` submit (moderated) |
| `/api/feedback` | `POST` submit · `me` |
| `/api/ask` | free-text career matching, no account needed |
| `/api/users/me` | `photo` · `resume` · `upload` |
| `/api/admin` | careers · media · stories · feedback · questions |

## Security

bcrypt at 12 rounds · JWT access (15 m) + refresh (7 d) in httpOnly, SameSite,
Secure cookies · silent refresh with request replay · zod validation on every
route · helmet · CORS locked to the client origin · rate limiting on auth ·
server-side role checks · secrets in `.env` only.

The quiz's scoring weights are stripped before the questions reach the browser.
Passwords are never returned by any endpoint, and the passport's "Access Key"
field is a fixed mask — not the value and not a length hint.

## Performance

- Route-level code splitting: **86 KB gzipped** initial JS (60 KB of that is React)
- `transform`/`opacity` animations only; nothing loops forever above the fold
- `IntersectionObserver` for scroll reveals, disconnected after first hit
- Lean Mongo reads, indexes on every query path
- The opening cinematic is CSS — the app has no hard dependency on any video file

## Contributed content

Visitors can submit a success story or an item for the multimedia centre, with
an image or a clip attached. **Nothing a visitor submits is ever visible until
an administrator publishes it** — the server writes `published: false` /
`active: false` itself rather than reading a flag from the request, so a
submission cannot publish itself.

Uploads are checked against their **magic bytes**, not their file extension: an
extension is a claim, the leading bytes are evidence. SVG is refused outright —
it is a document that can carry script, and uploads are served back from our own
origin. Files are stored under a random name, never the one the browser sent.

| | limit |
|---|---|
| Passport photograph | 1 MB · JPG, PNG, WebP |
| Story / multimedia image | 2 MB · JPG, PNG, WebP, GIF |
| Multimedia video | 12 MB · MP4, WebM |
| Resume | 2 MB · PDF, DOC, DOCX — only the owner can download it |

## Media pipeline

`tools/encode-media.mjs` turns the 2560×1440 masters in `media/higgsfield/raw/`
into everything the site serves. Every output is declared in a manifest with the
source it comes from and the treatment it gets; `--check` verifies the shipped
files still match without writing anything.

Three tiers, because one file cannot serve every screen:

- **1080p + WebM** — the floor, and a 1:1 match for a 1920-wide display.
- **1440p (`-2k`)** — served only where `innerWidth × devicePixelRatio ≥ 2000`,
  and never on a Save-Data connection. Measured with VMAF against the master:
  1440p/crf28 scores 92.3 against 89.6 for 1080p/crf26, and costs ~40% more
  bytes. 1440p/crf30 scores the *same* as 1080p/crf26 — the extra pixels get
  spent back on compression, so there is no free version of 2K.
- **540×960 (`-portrait`)** — a 16:9 plate filling a 390×800 phone with
  `object-fit: cover` keeps only 27% of the frame. The portrait cuts raise that
  to 87%.

Scroll-driven films are excluded from the 2K tier deliberately: seeking decodes
up to six frames per seek, which is 8.6M pixels at 900p against 22M at 1440p.
Resolution is the one thing a scrubbed film cannot afford.

## Accessibility

Light and dark themes, dark by default — the site is built dark, and light is a
setting someone chooses rather than one they are handed. Contrast is verified
rather than assumed: every route is swept in **both themes** and clears WCAG AA
(4.5:1 for text, 3:1 for large text).

`prefers-reduced-motion` is honoured everywhere — reduced motion means fewer
animations, never less content. 44 px minimum touch targets, visible focus
rings, a skip link, `aria-live` on the quiz progress, and radio semantics on the
answer cards.

## Tests

```bash
npm test                              # 14 unit tests on the scoring maths
node server/tests/api-smoke.mjs       # 51 end-to-end API checks
node server/tests/refresh-smoke.mjs   # 11 token-lifecycle checks
```

The smoke tests need the API running (`npm run dev`).

## The cinematics

Fourteen Higgsfield masters at 2560×1440, one per beat of the journey, encoded
for the web by the pipeline above. The plates play; two of them are scrubbed by
the scrollbar rather than played.

| Role | Clips |
|---|---|
| Landing film (scrubbed) | `journey` — plus `-m` and `-portrait` cuts |
| Terminal, gates, cabin | `terminal` · `gate` · `cabin` |
| Flight sequence | `boarding` · `takeoff` · `cruise` · `landing` · `arrival` |
| Passport and stamp | `passport-intro` · `stamp` |
| Closing film (scrubbed) | `briefcase` — plus a `-portrait` cut |

Every one ships at 1080p with a WebM sibling, a 1440p `-2k` cut, a 540×960
`-portrait` cut and a poster. Masters stay untouched in
`media/higgsfield/raw/`.

```bash
node tools/encode-media.mjs           # rebuild everything in the manifest
node tools/encode-media.mjs --check   # verify what ships, write nothing
```

**Video is a layer, never a dependency.** `SceneVideo` probes the file and
checks its `content-type` — a host answering a missing path with `index.html`
will not fool it — and renders the hand-built CSS scene underneath in every
other case: file missing, slow connection, data saver, or reduced motion. Delete
`client/public/videos/` and the whole journey still runs.

---

## Known gaps

- **Salary data is estimated, not sourced.** See above. This is the one thing to
  fix before real use.
- **Fonts load from Google Fonts.** Self-hosted WOFF2 subsets would remove a
  third-party render-blocking dependency — worth doing before a live demo on
  venue wifi.
- **Mobile is verified in the browser, not on real hardware.** Layouts,
  breakpoints, the portrait video cuts and the top tab bar have all been
  measured at 390 px, but nothing has been opened on an actual phone.
- **The free-text matcher at `/api/ask` has no UI.** It works — it reads
  negation, explains itself and admits when a sentence gave it nothing — but
  nothing in the client calls it. It also matches on substrings, so short
  signal words hit inside longer ones (`art` inside `apart`); fix that before
  surfacing it.
- **The multimedia centre ships empty.** The submission form and moderation
  queue work; there is simply no seeded content, because the repository holds
  no photographs of the professions and placeholder imagery would have been
  claiming something untrue.
