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
Landing → Register / Login → Passport + VERIFIED stamp → Career Station
   → Career Train → Field selection → Quiz → Analysis → Result
   → Roadmap → Briefcase → Dashboard
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
      + 0.10 × the field the user chose on the train
```

Each of the 40 quiz options carries two vectors: **field weights** (which of the
six fields it points at) and a **Holland/RIASEC vector** (Realistic,
Investigative, Artistic, Social, Enterprising, Conventional). Each of the 36
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

The 36 careers are seeded with skills, learning areas, six-stage roadmaps,
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
    hooks/        useAuth · useReveal · useCountUp · useTypewriter · useReducedMotion
    pages/        14 route components
    services/     api (axios + silent refresh) · career · quiz
    styles/       tokens · global · forms · motion · passport · station · quiz · briefcase · app

server/
  src/
    config/       env · db
    models/       User · CareerField · Career · QuizQuestion · QuizOption
                  QuizAnswer · QuizResult · SavedCareer
    controllers/  auth · user · career · quiz · savedCareer
    services/     recommendation.service.js   ← the engine
    middleware/   auth · validate · rateLimit · errorHandler
    validators/   zod schemas
    seed/         careerFields · careers.part1/2 · questions · seed.js
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

## Accessibility

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

Five Higgsfield clips, one per journey stage, generated keyframe-first
(MiniMax H3 at 2K from an approved Soul 2 still) and encoded for the web:

| Scene | Clip | mp4 | webm |
|---|---|---|---|
| Landing hero | `passport-intro` | 804 KB | 619 KB |
| Passport + stamp | `stamp` | 853 KB | 543 KB |
| Career Station | `station` | 1099 KB | 1040 KB |
| Career Train | `train-interior` | 875 KB | 615 KB |
| Briefcase finale | `briefcase` | 737 KB | 537 KB |

Masters stay untouched in `media/higgsfield/raw/`. To re-encode after adding
or replacing one:

```bash
node tools/encode-media.mjs
```

That scales to 1080p, writes H.264 + VP9, extracts a poster from the first
frame, and warns about anything over the 800 KB budget.

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
- **Mobile is untested on real hardware.** The responsive CSS and breakpoints
  are written, but everything has been verified on desktop only.
- No admin panel and no PDF export — both were scoped out deliberately.
