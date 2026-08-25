# 07 — Implementation Plan (MERN)

> No code is written yet. This is the architecture we build against once the plan is signed off.

## 7.1 Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React 18 + Vite** | Fast HMR, tiny config, trivial to deploy. Vite over CRA — CRA is deprecated. |
| Routing | React Router v6 | Nested layouts + route-level code splitting |
| Styling | **Tailwind CSS + CSS variables** | Tokens from `05-DESIGN-SYSTEM.md` live as CSS vars; Tailwind for speed. Custom `@layer components` for the branded parts. |
| Motion | **GSAP + ScrollTrigger** (scroll cinema) + **Framer Motion** (component/layout) + **Lenis** (smooth scroll) | Two libraries with clear, non-overlapping jobs. GSAP owns the scroll film; Framer owns UI state and shared-element transitions. |
| Charts | **Recharts** | Radar, area, bar — enough for every chart we need, tweenable, small |
| Icons | Lucide React | Consistent 1.5px stroke |
| State | **Zustand** + TanStack Query | Zustand for UI/auth state, TanStack Query for all server state. No Redux — it's overhead we don't need. |
| Forms | React Hook Form + Zod | Zod schemas shared with the backend |
| Backend | **Node 24 + Express 5** | Node 24 is already installed locally |
| Database | **MongoDB Atlas + Mongoose** | Free tier, works from anywhere, no local install for teammates |
| Auth | **JWT access + refresh, httpOnly cookies** + bcrypt | Access token 15min, refresh 7d, rotation on use |
| Validation | Zod on both sides | One schema, two consumers |
| Media | **Cloudinary** (images) + video from the static build or Bunny CDN | Free tiers; keeps large binaries out of git |
| PDF | **PDFKit** server-side | Generates the Career Passport PDF |
| Email | Nodemailer + Brevo/Resend free tier | Verification + password reset |
| Deploy | Vercel (client) · Render (API) · Atlas (DB) | All free tier; live URL for judges |

**Explicitly rejected:** Next.js (the brief says MERN — Express is the point), Redux Toolkit (overkill), Three.js (huge bundle for one map that SVG does better), Socket.io (nothing here is realtime).

---

## 7.2 Folder structure

```
pathseeker/
├─ docs/                      ← this plan
├─ media/higgsfield/          ← refs, raw, masters, web, prompts.json
├─ tools/
│  ├─ encode-media.sh         ← ffmpeg batch: mp4/webm/720p/scrub/poster
│  └─ higgsfield-batch.js     ← only if API access is confirmed
│
├─ client/
│  ├─ public/
│  │  ├─ media/               ← final web-ready video + posters
│  │  └─ fonts/               ← self-hosted WOFF2 subsets
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ router/
│     │  ├─ index.jsx
│     │  ├─ ProtectedRoute.jsx
│     │  └─ RoleRoute.jsx
│     ├─ styles/
│     │  ├─ tokens.css        ← the design system, verbatim
│     │  ├─ global.css
│     │  └─ textures/
│     ├─ lib/
│     │  ├─ api.js            ← axios instance + refresh interceptor
│     │  ├─ motion.js         ← shared easings, durations, variants
│     │  └─ format.js
│     ├─ hooks/
│     │  ├─ useScrollScrub.js
│     │  ├─ useReducedMotion.js
│     │  ├─ useInViewOnce.js
│     │  ├─ useCountUp.js
│     │  └─ useAuth.js
│     ├─ store/               ← Zustand slices: auth, ui, quiz
│     ├─ components/
│     │  ├─ primitives/       ← Button, Card, Input, Pill, Modal, Skeleton, Tooltip
│     │  ├─ brand/            ← CompassMark, Passport, Stamp, MetroMap, SplitFlap
│     │  ├─ motion/           ← Reveal, Stagger, PageTransition, MagneticCTA, CountUp
│     │  ├─ media/            ← CinematicVideo, ScrubVideo, PosterImage, AudioPlayer
│     │  ├─ layout/           ← Navbar, Footer, MobileTabBar, DashboardShell, Sidebar
│     │  └─ charts/           ← SkillRadar, SalaryProgression, MatchRing, GapBars
│     ├─ features/
│     │  ├─ landing/          ← Scene00..Scene11, ChapterRail, HeroLoop
│     │  ├─ auth/
│     │  ├─ quiz/             ← QuizEngine, QuestionCard, MetroProgress, LivePreview
│     │  ├─ careers/          ← CareerGrid, BoardView, FilterBar, CareerDetail
│     │  ├─ dashboard/        ← student/, graduate/, professional/ + shared widgets
│     │  ├─ resources/
│     │  ├─ stories/
│     │  ├─ multimedia/
│     │  └─ admin/
│     └─ pages/               ← thin route components that compose features
│
└─ server/
   ├─ src/
   │  ├─ index.js
   │  ├─ app.js               ← express app, middleware chain
   │  ├─ config/              ← db.js, env.js, cloudinary.js
   │  ├─ models/              ← User, Career, QuizQuestion, QuizResult,
   │  │                          Resource, Story, MediaItem, SavedCareer
   │  ├─ routes/              ← auth, users, careers, quiz, resources,
   │  │                          stories, media, admin, passport
   │  ├─ controllers/
   │  ├─ services/
   │  │  ├─ recommendation.service.js   ← the scoring engine
   │  │  ├─ passportPdf.service.js
   │  │  └─ mail.service.js
   │  ├─ middleware/          ← auth, role, validate, errorHandler, rateLimit
   │  ├─ validators/          ← Zod schemas
   │  ├─ seed/                ← careers.json (60+), questions.json, seed.js
   │  └─ utils/
   └─ tests/
```

**Architectural rule:** `pages/` are thin. All real work lives in `features/`. A page composes; it does not implement. This keeps files small enough for a team of students to work in parallel without constant merge conflicts.

---

## 7.3 Data model (core collections)

```js
User      { name, email, passwordHash, role: 'student'|'graduate'|'professional'|'admin',
            passportNumber, avatar, profile: { education, currentRole, subjects[], skills[] },
            savedCareers[ref], stamps[{type, careerRef, earnedAt}], createdAt }

Career    { slug, title, field, description, dayInLife, skills[{name, weight, level}],
            educationPaths[], salary: { entry, mid, senior, currency },
            growthOutlook, workStyle: { pace, collaboration, environment },
            riasecProfile: { R,I,A,S,E,C },  // the matching vector
            relatedCareers[ref], media: { hero, gallery[] }, resources[ref] }

QuizQuestion { section: 'interests'|'aptitude'|'workstyle'|'values', text, type,
               options[{ label, value, weights: { R,I,A,S,E,C, ...traits } }], order, active }

QuizResult { user, answers[], scores: { R,I,A,S,E,C, traits },
             matches[{ career, score, reasons[] }], takenAt }

Resource  { title, type, provider, url, field, skillTags[], level, durationHours, free }
Story     { person, fromSituation, toCareer, timelineYears, quote, body, route[], media }
```

**The `riasecProfile` field is the hinge of the whole product.** Every career carries a six-axis vector; the quiz produces a user vector; matching is cosine similarity plus weighted trait adjustments. It's a real, defensible, explainable method (Holland Codes are established career-guidance theory) and it requires no ML, no API cost, and no black box.

---

## 7.4 Recommendation engine

```
score(user, career) =
      0.45 × cosineSimilarity(user.riasec, career.riasecProfile)
    + 0.25 × skillOverlap(user.skills, career.skills)      // weighted by skill importance
    + 0.15 × valuesAlignment(user.values, career)           // salary/impact/stability/creativity
    + 0.15 × workStyleFit(user.workstyle, career.workStyle)
    − penalties(educationMismatch, roleContext)
```

- Weights live in the DB, tunable from the admin panel — that's the admin WOW feature in §6.12
- Every match returns **`reasons[]`**: human sentences generated from the top contributing factors. *"Your Investigative and Realistic scores are both in the top band, which is the dominant profile for this field."*
- Role changes the shape of the output, not the maths: students get breadth (top 8 across 5 fields), graduates get entry-role depth, professionals get transition difficulty and salary delta
- Deterministic and instant — no external API, nothing to fail during a live demo

---

## 7.5 Video integration strategy

**Component contract** — one component, three modes:

```
<CinematicVideo scene="s03" mode="scrub|autoplay|loop" poster={...} />
```

The component itself decides what to actually do:

| Condition | Behaviour |
|---|---|
| `prefers-reduced-motion` | Render the poster still. No video element mounted at all. |
| Viewport < 1024px | `mode="scrub"` downgrades to autoplay-on-enter via IntersectionObserver |
| `navigator.connection.saveData` or `effectiveType` ≤ 3g | Poster only, with a tap-to-play control |
| Not yet in viewport | `preload="none"`, poster only. Preload starts one section ahead. |
| Otherwise | Full behaviour |

**Loading rules**
- Hero clip: `preload="metadata"`, poster inlined as a base64 LQIP behind the AVIF for zero-flash paint
- All others: `preload="none"` until one viewport away
- `<video muted playsinline autoplay loop disablePictureInPicture>` — `playsinline` is non-negotiable or iOS opens fullscreen and ruins the experience
- `<source>` order: AV1/WebM first, H.264 MP4 fallback
- Never more than **two** video elements decoding simultaneously — pause off-screen videos in the IntersectionObserver callback. Three decoding videos will stutter a mid-range laptop, and the judge's laptop is a mid-range laptop.

**Weight budget:** hero ≤ 2MB · each section clip ≤ 800KB · full landing page first load ≤ 3.5MB including the hero. Remaining clips stream in on scroll.

---

## 7.6 Performance strategy

- **Route-level code splitting** — `React.lazy` per route. Admin, quiz and dashboards are separate chunks; a visitor who never logs in never downloads them.
- **Bundle budget:** initial JS ≤ 180KB gzipped. GSAP imported by plugin, not wholesale. Recharts lazy-loaded (charts are always below the fold).
- **Images:** AVIF with WebP fallback, explicit `width`/`height` on every image to kill CLS, `loading="lazy"` below the fold, `fetchpriority="high"` on the hero poster only.
- **Fonts:** self-hosted, subset, `font-display: swap`, preload the two files used above the fold.
- **CSS:** Tailwind purge on; tokens in one file; critical CSS inlined by the Vite plugin.
- **API:** indexes on `Career.slug`, `Career.field`, `User.email`, `QuizResult.user`. Lean queries (`.lean()`) for read-only lists. Response compression on. Cache the career bank in memory for 5 minutes — it changes almost never.
- **Targets:** LCP < 2.0s · CLS < 0.05 · INP < 200ms · Lighthouse Performance ≥ 90 desktop, ≥ 75 mobile (mobile takes the video hit, and that's an accepted trade).
- **Measure, don't guess:** run Lighthouse at the end of every build phase and record the numbers in `docs/perf-log.md`. A graph of improving scores is itself a slide in the presentation.

---

## 7.7 Mobile optimisation strategy

- Mobile-first CSS; the cinematic layer is progressive enhancement
- 720p video variants; scrubbing disabled; max one video playing at a time
- Bottom tab bar for thumb reach; all primary actions in the lower two-thirds
- 44px minimum touch targets everywhere
- No hover-dependent functionality — every hover reveal has a tap equivalent
- `100dvh` not `100vh` (mobile browser chrome makes `vh` lie)
- Quiz optimised hardest: single column, large tap targets, auto-advance, progress always visible, answers saved to localStorage on every question so a dropped connection never loses progress
- Test on a real mid-range Android, not just DevTools emulation. Emulation hides thermal throttling and decoder limits — the two things that actually break video-heavy pages.

---

## 7.8 Security & correctness baseline

- bcrypt (12 rounds), httpOnly + SameSite=Strict + Secure cookies, refresh-token rotation
- Zod validation on every route; `express-rate-limit` on auth endpoints; `helmet`; CORS locked to the deployed client origin
- No secrets in the repo — `.env.example` committed, `.env` gitignored
- Role checks enforced **server-side** on every admin route. Hiding the admin link in the UI is not authorisation, and a sharp judge will type the URL.
- Global error handler returning consistent shapes; no stack traces in production responses
