# 08 — Build Roadmap, Risks & Demo Day

## 8.1 Two parallel tracks

The film and the software must be built **at the same time by different effort**, or the video production will block engineering and you'll ship a beautiful trailer attached to a broken app.

```
TRACK A — FILM        keyframes → generations → grade → encode → integrate
TRACK B — SOFTWARE    scaffold → auth → data → engine → UI → polish
                      (runs entirely on placeholder posters until Phase 5)
```

---

## 8.2 Phases

### Phase 0 — Foundation *(sign-off gate)*
- [ ] This plan reviewed and approved
- [ ] Repo initialised, `client/` + `server/` scaffolded, Tailwind + tokens wired
- [ ] MongoDB Atlas cluster + Cloudinary account created, `.env.example` committed
- [ ] Design tokens implemented in `tokens.css` and verified against §5.1
- [ ] Placeholder posters generated for all 12 scenes (solid navy + scene number) so the build never waits on video

**Exit criteria:** `npm run dev` starts both apps; a styled Button and Card render with correct tokens.

### Phase 1 — Data & backbone
- [ ] Mongoose models for all 8 collections
- [ ] Seed data: **60+ careers** with full `riasecProfile` vectors, 24 quiz questions, 40 resources, 8 stories
- [ ] Auth: register, login, refresh, logout, password reset
- [ ] Career CRUD + public list/detail endpoints
- [ ] Recommendation service with unit tests on the scoring maths

**Exit criteria:** Postman can register a user, submit fake quiz answers, and get ranked matches with reasons.

*This phase is where the marks are. Do not let it slip in favour of animation work.*

### Phase 2 — Core product UI
- [ ] Layout shell, nav, mobile tab bar, route transitions
- [ ] Auth pages with passport-number issuance
- [ ] Quiz engine end to end (metro progress, auto-advance, localStorage resume)
- [ ] Result page with the full reveal choreography (using placeholder video)
- [ ] Career bank + detail page + board view

**Exit criteria:** a real user can sign up, take the quiz, and see a real, explainable result. **This is the minimum shippable product** — if everything after this point failed, you'd still have a competent entry.

### Phase 3 — Dashboards & admin
- [ ] Three role dashboards with their distinct primary widgets
- [ ] Gap Closer, Subject→Career explorer, Switch Cost Calculator
- [ ] Admin CRUD, analytics, live weight tuning
- [ ] Resources + auto-built learning path
- [ ] Stories + multimedia centre

### Phase 4 — Cinematic layer
- [ ] Lenis + GSAP ScrollTrigger installed and scoped
- [ ] Landing page 12-beat film assembled with real clips as they arrive
- [ ] Interactive metro map SVG
- [ ] All hover/micro-interactions per `04-MOTION-DESIGN.md`
- [ ] Reduced-motion path verified for every animated section

### Phase 5 — Polish & proof
- [ ] PDF Career Passport export (the closing artefact)
- [ ] Accessibility pass — keyboard, contrast, screen reader, focus order
- [ ] Lighthouse ≥ 90 desktop; record in `docs/perf-log.md`
- [ ] Real-device testing (mid-range Android + iPhone Safari)
- [ ] Deploy: Vercel + Render + Atlas, live URL confirmed working from a phone on mobile data
- [ ] Seed a demo account with a completed passport so judges never see an empty state
- [ ] README, architecture diagram, presentation deck, 90-second demo video

### Track A milestones (run alongside)
- [ ] Character-lock reference approved
- [ ] Scenes 0, 11 generated back-to-back (identity continuity)
- [ ] Scenes 1, 2, 10 generated — the three that carry the brand
- [ ] Remaining seven scenes batch-generated
- [ ] All clips graded, encoded, poster-extracted, `prompts.json` complete

---

## 8.3 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Higgsfield output inconsistent across scenes | High | High | The four locks (§3.5). Accept slight variance in scenes 4/7/9 — they're background plates. |
| Character identity breaks between Scene 0 and 11 | High | Medium | Generate them back-to-back from one reference. Fallback: shoot Scene 11 from behind / over-the-shoulder so the face isn't the continuity carrier. |
| Credits run out mid-production | Medium | High | Hero scenes first. Scenes 4, 7, 9 degrade gracefully to stills with CSS parallax. |
| Video weight tanks mobile performance | Medium | High | Weight budgets (§7.5), poster-only on slow connections, hard cap of 2 decoding videos. |
| Scroll-scrub janky on some machines | Medium | Medium | Desktop ≥1024px only; feature-detect and fall back to autoplay-on-enter. |
| Animation work eats the time budget for backend | **High** | **Critical** | **Phase 2 must complete before Phase 4 starts.** No exceptions. A gorgeous landing page with a fake quiz loses to a plain site with a real engine. |
| Live demo fails on venue wifi | Medium | Critical | Record a 90-second backup demo video. Run a local build offline as a second fallback. Pre-seed the demo account. |
| Judges can't find the real features behind the film | Medium | High | The `Skip to app →` pill, the chapter rail, and a `?demo=1` URL that jumps straight to a completed dashboard. |

---

## 8.4 Demo-day script (7 minutes)

```
0:00  Land on homepage. Silence. Let Scene 0 play. Say nothing for 4 seconds.
0:10  "This is what career confusion looks like. 60% of students change
       their field within two years of choosing it."
0:25  Scroll through the film to the metro map. Hover a line. "Careers aren't
       cages. They're a network — and this map is generated from our database."
1:10  Click Skip to app. Take the quiz — answer 5 questions live, point at the
       live match preview shuffling in the corner.
2:00  Submit. Let the stamp land. Say nothing during the reveal.
2:20  Walk the result: match %, the reasons, the skills gap, the roadmap.
       "Every number here has a sentence behind it. Nothing is random."
3:20  Graduate dashboard → Gap Closer. Mark a skill complete. Watch the match
       % tick up live. "That's the engine recomputing, not an animation."
4:20  Admin panel. Move the weighting sliders. Show the top-5 recomputing.
       "This is the algorithm, visible and tunable."
5:20  Download the PDF passport. Hold it up.
6:00  Success stories close. Scene 11 plays — the same person, transformed.
       "Same student. Same desk. Different Monday."
6:40  Questions.
```

The structure is deliberate: **emotion → product → proof → emotion.** Open and close on the film; put the hard technical evidence in the middle where scepticism peaks.

---

## 8.5 What gets cut first if time runs short

In order, cut from the bottom:

1. Multimedia centre audio player → replace with a simple list
2. Success stories filter → static wall
3. Switch Cost Calculator → static comparison table
4. Scenes 4, 7, 9 videos → graded stills with parallax
5. Board view → grid only

**Never cut:** the quiz, the recommendation engine with reasons, the result reveal, the admin CRUD, the PDF passport. Those five are the entry.
