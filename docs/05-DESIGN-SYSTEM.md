# 05 — UI/UX Design System

## 5.1 Colour tokens

```css
/* Surfaces — dark (default theme) */
--ink-900:   #060911;  /* page background, deepest */
--ink-800:   #0A1128;  /* primary surface */
--ink-700:   #0F1B3C;  /* raised surface / passport navy */
--ink-600:   #16244A;  /* borders on dark, hover surface */
--leather:   #3B2A1E;  /* accent surface, texture only, rare */

/* Gold */
--gold-500:  #C9A227;  /* primary accent, CTAs, active states */
--gold-400:  #D9B84A;  /* hover */
--gold-300:  #E8C766;  /* champagne, highlights, glints */
--gold-100:  #F0E2B8;  /* subtle washes */

/* Cream — light theme surfaces */
--cream-50:  #FAF7F0;
--cream-100: #F5F0E6;
--cream-200: #EDE6D6;  /* parchment */
--cream-300: #DDD3BE;  /* light borders */

/* Text */
--text-hi:   #F5F0E6;  /* primary on dark */
--text-mid:  #B6BCCB;  /* secondary on dark */
--text-low:  #7A8296;  /* tertiary / captions */
--text-dark: #10141F;  /* primary on light */

/* Semantic */
--success:   #2E7D5B;
--warn:      #B4791F;
--danger:    #A63A32;
--info:      #3B6E8F;
```

**Usage discipline:** gold is **never** a background for large areas. It is ink, edge, and light. Large gold fills read as cheap. **Maximum gold coverage on any screen: ~8%.**

Dark is the default theme (cinematic). Light theme exists for the dashboards and the printed passport — cream surfaces, navy text, same gold accent.

**Contrast note:** gold `#C9A227` on navy `#0A1128` = **6.9:1** ✓ AA. Gold on cream **fails** — so on light surfaces gold is used for borders, icons and rules only, never body text.

---

## 5.2 Typography

| Role | Family | Weight | Size / tracking |
|---|---|---|---|
| Display / hero | **Fraunces** (variable serif) | 300–600, high optical size | `clamp(2.75rem, 6vw, 5.5rem)`, tracking `-0.02em`, line-height `1.05` |
| Section heading | Fraunces | 500 | `clamp(1.75rem, 3.5vw, 3rem)`, `-0.01em` |
| Body / UI | **Inter** (variable) | 400 / 500 | `1rem` / `1.65`, max measure `68ch` |
| Eyebrow / label | Inter | 600 | `0.75rem`, UPPERCASE, tracking `0.14em` |
| Data / stamps / codes | **IBM Plex Mono** | 500 | `tabular-nums` always on for figures |

**Rules**
- Two families on screen at once, maximum.
- Serif is for *statements*, never for UI controls. A serif button looks like a wedding invitation.
- All numeric displays: `font-variant-numeric: tabular-nums`.
- Subset fonts to Latin + used glyphs, `font-display: swap`, **self-hosted WOFF2**. No external font CDN — it's a render-blocking third party and a competition-day single point of failure.

---

## 5.3 Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | Gold gradient (`--gold-500` → `--gold-400`), navy text, 999px radius, 14×32px padding, soft gold glow | One per screen |
| **Secondary** | Transparent, 1px gold border, gold text; fills gold on hover | Alternate actions |
| **Ghost** | No border, `--text-mid`, underline on hover | Tertiary |
| **Danger** | 1px danger border, danger text, fills on hover | Destructive, admin only |
| **Icon** | 40×40, 12px radius, `--ink-700` surface | Toolbars |

All buttons: min **44×44px** touch target, visible `:focus-visible` ring (2px gold, 2px offset), `cursor: pointer`, disabled state without motion.

---

## 5.4 Cards

- Surface `--ink-700` (dark) / `--cream-100` (light)
- Border: **1px `rgba(201,162,39,0.14)`** — a hairline gold, not a grey box. This one value is most of the "premium" feeling.
- Radius **16px** (12px mobile). Ticket/stamp components use 4px with notched edges via `mask-image`.
- Padding 24px desktop / 18px mobile
- Shadow: layered and soft — `0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.28)`. **Never a single hard shadow.**

**Career card anatomy:** 16:9 image strip → category pill → title → one-line summary → three stat chips (match %, salary band, growth) → bookmark stamp button.

---

## 5.5 Navigation

- **Desktop:** transparent over the hero; past 80px scroll it becomes a **floating pill** — 92% width, blurred navy glass, gold hairline, 999px radius, detached from the top edge. 300ms transition.
- Left: wordmark (serif) + compass emblem. Centre: **5 links max.** Right: theme toggle · `Sign In` (ghost) · `Issue My Passport` (primary).
- **Authenticated:** the right side becomes an avatar wrapped in a passport-progress ring showing % completion.
- **Mobile:** bottom tab bar — Home · Explore · Quiz · Passport · Profile. Thumb-reachable, app-like, and it visually separates us from every Bootstrap submission in the room.
- **Dashboard:** collapsible left sidebar, icon + label, active item marked by a gold left bar and a subtle gold wash.

---

## 5.6 Dashboard layout

- 12-column grid, 24px gutters, max-width 1440px

```
Row 1   greeting + passport-completion ring + 3 stat tiles
Row 2   primary widget (role-specific, 8 cols) + secondary (4 cols)
Row 3   recommendations rail (horizontal scroll-snap)
Row 4   activity timeline (7 cols) + saved careers (5 cols)
```

**Every widget carries:** an eyebrow label, a big number, a delta, and **a one-line human interpretation.** No naked charts — a chart without a sentence is a puzzle, not information.

---

## 5.7 Glass effects — sparingly, with discipline

Permitted in exactly **four** places: the floating nav pill, modal/dialog backdrops, the video-overlay text panel, and the mobile bottom bar.

```css
background: rgba(10, 17, 40, 0.62);
backdrop-filter: blur(18px) saturate(140%);
border: 1px solid rgba(201, 162, 39, 0.16);
```

Always ship a solid fallback via `@supports not (backdrop-filter: blur(1px))`. **Never stack two glass layers** — it turns to mud and destroys mobile GPU performance.

---

## 5.8 Shadows, radius, spacing, icons, texture

**Shadow scale — four values, no improvising**
```
sm    0 1px 2px rgba(0,0,0,.40)
md    0 4px 12px rgba(0,0,0,.30)
lg    0 12px 32px rgba(0,0,0,.28)
glow  0 0 24px rgba(201,162,39,.22)
```

**Radius scale — five values, no improvising**
`4` (stamps, tickets) · `12` (inputs, small cards) · `16` (cards) · `24` (modals, hero panels) · `999` (pills)

**Spacing** — 4px base: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. Section rhythm: 96px mobile / 128px desktop.

**Icons** — Lucide React, **1.5px stroke**, 20px default. Consistent stroke weight matters more than icon choice. Custom hand-drawn SVGs only for the four brand assets: compass emblem, passport, stamp, metro glyphs.

**Texture** — one paper-grain PNG at **3% opacity** over cream surfaces, one noise at **2%** over navy. This costs ~8KB and is the single clearest separator between "premium" and "default Tailwind". Do not skip it.

---

## 5.9 Mobile responsiveness

- Breakpoints: `480 / 768 / 1024 / 1280 / 1536`
- **Mobile-first CSS.** The desktop cinematic layer is *added*, never subtracted.
- Hero video: 720p, centre-cropped from the 16:9 master via `object-fit: cover; object-position: center` — exactly why scene composition mandates a centre-safe subject
- **Scroll-scrubbed video is disabled below 1024px** (mobile Safari does not scrub reliably) — replaced by autoplay-on-enter clips via IntersectionObserver
- Type scales with `clamp()`. **No fixed px font sizes anywhere.**
- Tables become stacked cards below 768px
- The quiz is designed mobile-first — it is the most-used flow, and judges will test it on a phone

---

## 5.10 Accessibility — scored by judges, cheap to earn

- **WCAG AA contrast** on all text (see §5.1 note on gold)
- Full keyboard navigation; visible focus rings; skip-to-content link
- All videos `muted playsinline`; decorative videos `aria-hidden`; narrative ones mirrored by DOM text
- `prefers-reduced-motion: reduce` → cinematic sequences become graded stills, transitions become `0.01ms`
- Semantic landmarks, real `<button>` / `<a>` elements, labelled form fields, `aria-live` on quiz progress and result announcement
- Colour is never the sole carrier of meaning — match strength shows a % and a label, not just a colour
