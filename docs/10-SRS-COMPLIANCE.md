# SRS compliance — Career Passport

Audited against `Career Passport_Full-Stack App-SRS_final.pdf` (Aptech Limited,
Version 1.0). Text extracted with `tools/read-pdf.mjs`.

Legend: **✅ built** · **◐ partial** · **○ not built**

---

## 1.6 Functional Requirements

### User Authentication and Management

| Requirement | State | Where |
|---|---|---|
| Role-based registration and login (Student / Graduate / Professional) | ○ | Only `user` / `admin` exist. The three user types are **not** implemented. |
| Admin direct login access | ✅ | `admin@pathseeker.app`, `requireRole('admin')` server-side |
| Secure session management | ✅ | JWT access + refresh in httpOnly/SameSite cookies, silent refresh |
| Forgot / reset password with OTP or tokenised link | ○ | No reset flow, no mail service |
| Profile with editable education, skills, interests, work experience | ◐ | Education, age, location, current role editable. **Skills and interests are not.** |
| Resume upload *(optional)* | ○ | No file upload |

### Personalized Dashboard

| Requirement | State | Where |
|---|---|---|
| Personalised greeting | ✅ | `Dashboard.jsx` |
| Recent activity | ○ | Not tracked |
| Quiz results | ✅ | Latest result with score and reasons |
| Bookmarked items | ✅ | Saved careers |
| Recommends based on interaction history | ○ | Recommendations come from the quiz only |
| Dynamic widgets — Trending Careers, Top Picks | ○ | Not built |

### Career Bank (with Advanced Filters)

| Requirement | State | Where |
|---|---|---|
| Careers from a backend database | ✅ | 38 careers, MongoDB |
| Multi-level filtering (domain, skill, salary, demand) | ◐ | Field, skill and free text. **Salary and demand filters missing.** |
| Smart search with autocomplete and spell-check | ○ | Plain server-side regex search |
| Save search filters / preferences | ○ | Filters live in the URL only |

### Interest Quiz

| Requirement | State | Where |
|---|---|---|
| Multi-step quiz | ✅ | 10 questions, one at a time, resumable |
| Timed questions, sliders, Likert scales | ○ | Single-choice cards only |
| Quiz history stored | ✅ | Every `QuizResult` persists; `/results/me/all` |
| Auto-suggestion of streams and roles | ✅ | RIASEC engine with generated reasons |

### Interactive Multimedia Center

Everything in this section is **not built**: embedded video/podcast/explainer
streaming, transcript toggle, related content, admin tagging, star ratings.

### Success Stories Hub

Not built: story cards, domain filtering, timeline progression, user submission
with admin approval.

### Document Resource Library

Not built: downloadable PDFs and checklists, auto-preview modals, backend
tagging, download counts.

### Feedback and Analytics

| Requirement | State |
|---|---|
| Feedback form with type categorisation | ○ |
| Admin feedback analytics | ○ |
| In-app notification centre | ○ |

### Bookmarking, Notes and Sharing

| Requirement | State | Where |
|---|---|---|
| Bookmark a career | ✅ | `SavedCareer`, save/unsave |
| Bookmark articles or videos | ○ | Neither exists yet |
| Sticky notes on bookmarks | ◐ | `note` field exists on the model, no UI |
| Export notes as PDF, share by email/social | ○ | Not built |
| Auto-suggest similar careers from bookmarks | ○ | Related careers are field-based, not bookmark-based |

### Admin Control Panel

| Requirement | State | Where |
|---|---|---|
| View users, roles, activity | ✅ | `/admin` — search, detail, promote/demote |
| Usage statistics | ✅ | Users, quizzes, saves, top destinations |
| Add/edit/remove career profiles | ○ | Read-only; careers change by re-seeding |
| Add/edit/remove quiz questions and scoring | ○ | Seed-file only |
| Manage multimedia, feedback, success stories | ○ | Those features do not exist |

### System Intelligence

Not built: recently-viewed history, predictive analytics, collaborative
filtering.

### Accessibility and UI Enhancements

| Requirement | State | Where |
|---|---|---|
| Dark mode toggle | ◐ | Dark is the only theme; no toggle |
| Font-size adjustment | ○ | Not built |
| Breadcrumbs | ◐ | Back links, not true breadcrumbs |
| Smooth transitions and loading states | ✅ | Throughout; `prefers-reduced-motion` honoured |

---

## Biggest gaps, in the order they are worth closing

1. **Three user roles.** The SRS opens with role-based registration and says
   content is segmented by academic or professional stage. This is the single
   most load-bearing requirement not met, and it touches registration, the
   dashboard and the recommendation output.
2. **Password reset with OTP.** Explicitly required, and a judge will look for
   it because it is the standard test of a real auth system.
3. **Admin CRUD for careers and quiz questions.** The panel reads; the SRS
   asks it to write.
4. **Feedback + analytics**, then **resources**, **multimedia**, and
   **success stories** — three whole content sections, each needing a model,
   routes, admin management and a page.
5. **Skills and interests on the profile**, which the engine could then use.

## What exceeds the SRS

The cinematic layer — passport authentication, departures board, boarding
pass, flight sequence, scroll-scrubbed film — is not in the specification at
all. The SRS asks for "intuitive UI, interactive tools, and visual aids"; this
goes considerably past that.
