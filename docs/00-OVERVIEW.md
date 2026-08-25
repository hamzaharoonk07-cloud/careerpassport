# PathSeeker — Career Passport
## Production Bible — Overview

**Competition:** Aptech TechWiz IAS
**Stack:** MERN (MongoDB · Express · React · Node) + Higgsfield cinematic AI video
**Status:** Planning phase — no application code written yet
**Owner:** Hamza Haroon

---

## The winning thesis

Most competition projects are *websites with a login*. PathSeeker is a **guided cinematic experience** that happens to be a full-stack app. The evaluator should stop scrolling within 4 seconds, and should still be able to *use the product* within 40.

Three things decide the score:

| Judge asks | PathSeeker answers with |
|---|---|
| "Is this technically real?" | Real MERN backend, JWT auth, 3 role-based dashboards, weighted recommendation engine, admin CRUD, seeded bank of 60+ careers |
| "Have I seen this before?" | The Career Passport metaphor + Higgsfield cinematic scroll story + a downloadable PDF passport with a personalised gold stamp |
| "Does it actually solve something?" | Confused student → explainable career match with skills gap, salary band, and a 4-stage roadmap |

**The single WOW moment we design everything around:** the quiz result reveal — the passport flips open, a brass stamp physically presses onto the page with a shockwave, and the recommended career is embossed on it. That is the 10-second clip that goes in the demo video.

**Non-negotiable constraint:** cinematic never costs usability. Every video is skippable, every animation respects `prefers-reduced-motion`, and the app must score Lighthouse ≥ 90 on desktop performance. Judges test on bad wifi.

---

## Document set

| File | Covers |
|---|---|
| `01-BRAND-STORY.md` | Emotional journey, storytelling arc, voice & copy rules |
| `02-CINEMATIC-SCENES.md` | All 12 landing-page scenes, fully specified |
| `03-HIGGSFIELD-STRATEGY.md` | How we connect Higgsfield, prompts, consistency system, encode pipeline |
| `04-MOTION-DESIGN.md` | Every animation on the site |
| `05-DESIGN-SYSTEM.md` | Colour, type, components, spacing, accessibility |
| `06-PAGES.md` | Page-by-page purpose, UI, animations, WOW features |
| `07-IMPLEMENTATION-MERN.md` | Folder structure, architecture, libraries, performance, data model |
| `08-ROADMAP.md` | Build phases, task board, risks, demo-day script |

---

## Working agreement

1. **No application code until this plan is signed off.** Assets and scaffolding only.
2. **Videos are assets, not dependencies.** The site must build and run with placeholder posters even if zero clips exist yet.
3. **Design tokens are law.** Anything not in `05-DESIGN-SYSTEM.md` does not get used.
4. **Every feature must survive the "so what?" test** — if a judge can't say what it's for in one sentence, it gets cut.
