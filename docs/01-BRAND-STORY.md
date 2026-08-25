# 01 — Brand Story & User Emotion

## 1.1 The core insight

Career confusion is not a lack of information — it is a lack of *permission to decide*. Students drown in options and have no framework for choosing. PathSeeker's promise is not "find a job." It is:

> **"You are not lost. You are un-stamped."**

The passport metaphor works because a passport is simultaneously:

- **Proof of identity** → your skills and interests, documented
- **Permission to travel** → the confidence to move toward a field
- **A record of a journey** → stamps accumulate as you progress
- **Aspirational and premium** → gold foil, deep navy, embossing, ceremony

It also gives us a full vocabulary for free: stamps, visas, departures, routes, boarding passes, customs, terminals. Every UI label writes itself.

---

## 1.2 The five-act emotional arc

| Act | Stage | Internal state (before) | What we do | State (after) | Emotion word |
|---|---|---|---|---|---|
| I | **Problem** | "Everyone else knows what they're doing. I don't." | Mirror their confusion — the lone desk, the unanswered question | "This thing understands me." | **Seen** |
| II | **Discovery** | "Maybe there's a way to figure this out." | Briefcase opens; value becomes possibility. The passport is issued. | "There's a system for this." | **Curious** |
| III | **Exploration** | "Show me what's out there — but don't overwhelm me." | Career Station / Metro / Roads. Options become *destinations*, not a list. | "Options feel navigable, not infinite." | **In control** |
| IV | **Decision** | "But which one is actually mine?" | Quiz → Match machine → Skill analysis → Elevator → Timeline → Stamp | "This is mine, and here's why." | **Certain** |
| V | **Success** | "Can I actually get there?" | Roadmap, resources, success stories, downloadable passport | "I have a first step for Monday." | **Capable** |

### Mapping the arc to the product

```
Act I    Landing hero (Scenes 0–1)              ~8s
Act II   Passport reveal + value (Scene 2)      ~10s
Act III  Station / Metro / Roads (Scenes 3–5)   ~20s scroll
Act IV   Quiz → Match → Analysis (Scenes 6–10)  ~6 min of real product use
Act V    Dashboard, roadmap, stories (Scene 11) ongoing return visits
```

The film is Acts I–III. The **product** is Acts IV–V. The transition between them must be invisible — the last scroll of the story should deposit the user directly onto the quiz CTA with no page break in feeling.

---

## 1.3 Emotional rules the whole team follows

1. **Never make the user feel judged.** No "you scored low." Always "your strength profile leans toward…"
2. **Confusion belongs to Act I only.** After the first fold, every screen must *reduce* cognitive load, never add.
3. **Ceremony over speed at exactly one point** — the result reveal. Everywhere else, speed wins.
4. **The user is the traveller; PathSeeker is the passport office.** Tone: warm, precise, quietly authoritative. Never hype-y, never emoji-spam.
5. **Every abstract number gets a human sentence.** "87% match" is always followed by *"because your problem-solving and systems-thinking scores sit in the top band for this field."*
6. **Nothing dead-ends.** Every screen offers exactly one obvious next action.

---

## 1.4 The three audiences and what changes for each

| Audience | Their real fear | What the product emphasises | Dashboard headline |
|---|---|---|---|
| **Student** (school/college) | "What if I pick the wrong subject?" | Exploration, breadth, low commitment, subject→career links | *"Your route is still being drawn."* |
| **Graduate** (fresh degree) | "My degree doesn't map to any job." | Skills translation, entry roles, portfolio and internship paths | *"You have more routes than you think."* |
| **Professional** (switching) | "It's too late to change." | Transferable skills, lateral moves, salary comparison, upskilling ROI | *"Interchange stations exist for a reason."* |

Same engine, same data, three different framings of the output. This is a genuine feature, not a cosmetic role flag — the recommendation weights, the roadmap length, and the resource mix all differ by role.

---

## 1.5 Voice & copy guidelines

**Headlines** — short, declarative, second person.
> *"Your future has a destination. Let's find the route."*
> *"Not everyone knows what's next. That's exactly why this exists."*
> *"Stop guessing. Get stamped."*

**Never use:** "revolutionary", "AI-powered synergy", "unlock your potential", "game-changing", "seamlessly". These are dead phrases and judges have read them 400 times today.

**Micro-copy carries the metaphor:**

| Standard label | PathSeeker label |
|---|---|
| Register | **Issue My Passport** |
| Start quiz | **Get Your Boarding Pass** |
| Career listing | **Departures Board** |
| Required skills | **Visa Requirements** |
| Milestone completed | **Stamp Collected** |
| Saved careers | **My Itinerary** |
| Learning resources | **Travel Guides** |
| Profile | **Passport Details** |

Use the metaphor for *labels and moments*, never for critical instructions. If a user might get confused about what a button does, the plain word wins. "Issue My Passport" is fine on a register CTA next to a "create your free account" subline; it is not fine on a payment confirmation.

**Empty states are in-world:**
> *"No stamps yet. Your passport is waiting."*
> *"Your itinerary is empty. Browse the departures board to add a destination."*

**Error states are plain and kind:**
> *"That email is already registered. Sign in instead?"* — not *"Passport control has rejected your documents."* Errors are the one place the metaphor stops.
