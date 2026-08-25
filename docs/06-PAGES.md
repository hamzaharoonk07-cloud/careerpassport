# 06 — Page-by-Page Experience Plan

Every page is specified as: **Purpose · Premium UI · Animations · WOW feature.**

---

## 1. Homepage

- **Purpose** — Convert a cold visitor into a quiz-taker in under 60 seconds while proving the product's quality in the first 4.
- **Premium UI** — Full-bleed cinematic hero with the video bleeding into the page background (same navy hex, so no visible frame edge). Floating glass nav pill. Gold chapter rail on the left. Sections: hero → problem statistics → the passport reveal → career station/metro (interactive SVG) → how it works (3 steps) → career preview rail → success stories → final CTA.
- **Animations** — The full 12-beat scroll film (`02-CINEMATIC-SCENES.md`), pinned scrub sections, staggered reveals, animated counters, magnetic CTA.
- **WOW feature** — The **interactive Career Metro map**: an SVG network where hovering a line highlights a career family and clicking an interchange node shows which skills transfer between fields. It's cinematic *and* genuinely useful, which is the exact combination judges reward.

---

## 2. Login / Register

- **Purpose** — Get through the door with zero friction while staying in-world.
- **Premium UI** — Split screen. Left: a looping muted clip of the passport (Scene 2) with a single line of copy. Right: a cream form card on navy, floating-label inputs with a gold underline that draws on focus. Register asks only for name, email, password, and role (Student / Graduate / Professional) — role selection is three illustrated cards, not a dropdown.
- **Animations** — Panel slides in from the right on mount. Input focus draws a gold underline (280ms). Password strength meter fills as a gold bar. Submit → button loading state → success checkmark → route wipe into the dashboard.
- **WOW feature** — On successful registration, a **passport number is issued** (`PS-2026-0041`) with a mono-font type-on animation and a stamp thud. The user has an artefact 400ms after signing up, before they've done anything.

---

## 3. Student Dashboard

- **Purpose** — Encourage exploration; reduce the fear of choosing wrong.
- **Premium UI** — Greeting + passport-completion ring. Stat tiles: *Careers explored · Quiz status · Stamps collected*. Primary widget: **"Your route so far"** — a personal metro line where completed actions are stations. Secondary: recommended-next-action card. Rails for suggested careers and beginner resources.
- **Animations** — Widget cascade on mount, ring draws to %, metro line draws station by station, recommendation rail scroll-snaps with momentum.
- **WOW feature** — **"Subject → Career" explorer**: pick the school subjects you enjoy and the metro map live-filters to show which routes open up. It answers the actual question a 16-year-old has, in one interaction.

---

## 4. Graduate Dashboard

- **Purpose** — Translate a degree into employable roles and close the confidence gap.
- **Premium UI** — Same shell, different content. Primary widget: **skills-gap radar** overlaying "your profile" against "target career requirements". Secondary: entry-level role matches with match %. Rails: internships/portfolio resources, CV checklist.
- **Animations** — Radar draws in 900ms and tweens when the target career changes via dropdown. Gap bars fill red→gold as you mark skills acquired.
- **WOW feature** — **The Gap Closer.** Select a target career, and the system lists exactly which skills you're missing, ranked by impact on match %, each with a linked resource and an estimated learning time. Marking one complete re-runs the match live and the % ticks up on screen. That live feedback loop is the most persuasive 15 seconds in the whole demo.

---

## 5. Professional Dashboard

- **Purpose** — Make a career switch feel like a lateral move, not a restart.
- **Premium UI** — Primary widget: **transferable-skills map** — your current role at centre, adjacent roles arranged by transition difficulty and salary delta. Secondary: side-by-side comparison of current vs. target (salary band, growth, work-life, entry difficulty). Rails: upskilling programmes, mid-career success stories.
- **Animations** — Nodes settle into place with a physics spring on load; hovering a node draws the transition path and animates a salary-delta counter.
- **WOW feature** — **Switch Cost Calculator.** Input current salary and available study hours per week; get an estimated transition timeline, a temporary income dip curve, and a break-even point rendered as a real chart. Nobody else in the competition will have modelled the *downside* honestly, and that honesty reads as maturity.

---

## 6. Career Quiz

- **Purpose** — Collect a clean signal on interests, aptitudes, work-style and values, and make it enjoyable.
- **Premium UI** — Distraction-free full screen. Metro-line progress bar with a train advancing station by station. One question per screen, large type, option cards with icons. Section interstitials as passport-control stamps. Persistent Back and Save-and-exit.
- **Structure** — ~24 questions across 4 sections: **Interests** (RIASEC-style), **Aptitudes** (self-rated + 3 mini scenario items), **Work Style** (environment, pace, collaboration), **Values** (salary vs. impact vs. stability vs. creativity). Mostly 5-point scales and forced-choice pairs — fast to answer, clean to score.
- **Animations** — §4.9 in full: slide transitions, auto-advance, gold border draw on selection, train movement, section stamp thud, terminus arrival → match machine.
- **WOW feature** — **Live match preview.** A small ghosted card in the corner updates its top-3 career guesses as you answer, showing them shuffling in real time. It converts a boring form into a slot machine you want to keep pulling — and it proves the engine is real, not a lookup table at the end.

---

## 7. Career Bank ("Departures Board")

- **Purpose** — Let anyone browse 60+ careers without an account and without drowning.
- **Premium UI** — A split-flap departures-board header. Filter bar: field, education level, salary band, growth outlook, work style. Grid of career cards; toggle to a "board view" that renders results as literal departures rows with mono type. Sort by match % when logged in.
- **Animations** — Split-flap letter animation on the header and on board-view rows (staggered, 30ms per row). FLIP re-layout on filter change. Card hover lift + gold border draw. Infinite scroll with skeleton shimmer.
- **WOW feature** — **Board view.** Same data, rendered as an airport departures board with flip animation. One dataset, two presentations, and the second one is unforgettable. Cheap to build (CSS + a small flip component), enormous demo value.

---

## 8. Career Detail Page

- **Purpose** — Convert interest into commitment with everything needed to decide.
- **Premium UI** — Cinematic header (career-specific image, gradient into page), match badge, quick-stat strip. Sections: What you'd actually do · Required skills (Visa Requirements) with your-level overlay · Education paths · Salary progression chart · Day in the life · Related careers (metro connections) · Resources · Success stories in this field.
- **Animations** — Shared-element morph from the card that opened it. Sticky sub-nav highlights the active section. Salary chart draws on entry. Skill bars fill with a gold gradient. Related-career metro nodes animate in.
- **WOW feature** — **"Add to Passport"** — clicking it plays the stamp animation and permanently adds the career to the user's itinerary and PDF passport. It closes the loop between browsing and the core artefact, so browsing feels like *collecting*.

---

## 9. Multimedia Center

- **Purpose** — Show the range of media the project handles (an explicit TechWiz scoring dimension) without it feeling like a dumping ground.
- **Premium UI** — Cinematic library: featured video hero, then tabs for **Career Films** (our Higgsfield scenes, presented as a showreel with per-scene notes), **Professional Interviews**, **Day-in-the-Life**, **Audio Guides** (podcast-style with a custom waveform player), **Infographics** (lightbox gallery).
- **Animations** — Video cards expand into an inline player rather than a modal. Custom player controls fade in on hover with a gold scrub bar. Audio waveform animates while playing. Gallery lightbox with shared-element zoom.
- **WOW feature** — A **behind-the-scenes strip** on the Career Films tab showing the Higgsfield prompt and the generated result side by side. Judges love seeing the craft, and it turns "we used AI video" from a suspicion into a documented, deliberate production method.

---

## 10. Success Stories

- **Purpose** — Provide social proof and the emotional close of Act V.
- **Premium UI** — Editorial magazine layout, not a card grid. Featured story full-bleed with a pull-quote in Fraunces. Below, an alternating asymmetric layout. Each story shows a **before → after route strip** (the person's actual metro path) with the timeline in years.
- **Animations** — Parallax on story images (0.85× scroll). Pull-quotes fade up with a gold rule drawing beneath. The route strip draws left to right on entry.
- **WOW feature** — **Filter stories by "started where you are."** Pick your current situation and the wall reorders to show people who began from the same place. It converts generic inspiration into personal evidence.

---

## 11. Resource Library

- **Purpose** — Give the user a concrete first step for Monday morning.
- **Premium UI** — Left filter sidebar (type, field, skill level, free/paid, duration). Resource rows with a type icon, title, provider, duration, and a "matched to your gap" gold badge. Saved-items tray docked at the bottom.
- **Animations** — Row hover reveals a quick-action bar (save / open / mark complete) sliding in from the right. Save animates the item flying into the tray. Progress rings on started resources.
- **WOW feature** — **Auto-built learning path.** Based on the quiz result and skills gap, the system sequences resources into an ordered Week 1 → Week 12 plan with checkpoints, exportable to the PDF passport. The user leaves with a plan, not a bookmark list.

---

## 12. Admin Dashboard

- **Purpose** — Prove this is a real system with real data management, not a hardcoded front end. This page is where technical marks are won.
- **Premium UI** — Light theme (cream), dense and utilitarian — a deliberate visual break from the cinematic front end that signals "this is the engine room." Sidebar: Overview, Careers, Users, Quiz Questions, Resources, Stories, Media, Settings.
- **Features** — Full CRUD on careers (with image upload), quiz question bank editor with live weight adjustment, user management with role changes, content moderation for stories, analytics: signups over time, quiz completions, most-viewed careers, match distribution.
- **Animations** — Restrained by design: table row hover, inline edit expansion, toast confirmations, chart transitions. **No cinematic effects here** — the contrast itself makes the point.
- **WOW feature** — **Live recommendation-weight tuning.** Adjust the weighting of interests vs. aptitude vs. values with sliders and watch a sample user's top-5 results recompute instantly in a preview panel. It makes the algorithm visible, auditable and obviously real — the single best answer to "did you actually build the matching, or is it random?"
