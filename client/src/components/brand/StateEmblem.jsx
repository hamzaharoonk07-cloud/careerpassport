/**
 * The State Emblem of Pakistan, as foil-blocked on the passport cover.
 *
 * Four elements, matching the real device: the crescent and star above, a
 * quartered shield bearing the four principal crops (cotton, jute, tea,
 * wheat), a wreath of jasmine either side, and a scroll beneath.
 *
 * Drawn as SVG so it inherits currentColor, stays crisp at any size, and
 * costs no request.
 */
export function StateEmblem({ size = 62, title }) {
  return (
    <svg
      viewBox="0 0 100 118"
      width={size}
      height={size * 1.18}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title && <title>{title}</title>}

      <defs>
        <mask id="pk-crescent-mask">
          <rect width="100" height="118" fill="#000" />
          <circle cx="46" cy="13" r="9.5" fill="#fff" />
          {/* The offset cut is what makes it a crescent rather than a disc */}
          <circle cx="51.5" cy="12" r="8" fill="#000" />
        </mask>
      </defs>

      {/* ── Crescent and star ─────────────────────────────── */}
      <rect width="100" height="118" fill="currentColor" mask="url(#pk-crescent-mask)" />
      <path
        d="M60 6 L61.6 10.2 L66 10.4 L62.5 13.1 L63.7 17.4 L60 14.9 L56.3 17.4 L57.5 13.1 L54 10.4 L58.4 10.6 Z"
        fill="currentColor"
        stroke="none"
      />

      {/* ── Shield ────────────────────────────────────────── */}
      <path d="M50 26 L72 33 V58 Q72 78 50 90 Q28 78 28 58 V33 Z" />

      {/* Quartered, as the real shield is */}
      <path d="M50 26 V90 M28 58 H72" strokeWidth="1.3" />

      {/* Cotton — boll and leaves, top left */}
      <g strokeWidth="1.1">
        <circle cx="39" cy="42" r="3.4" />
        <path d="M39 45.6 v4.2 M39 47 l-3 2 M39 47 l3 2" />
      </g>

      {/* Jute — stalk with leaves, top right */}
      <g strokeWidth="1.1">
        <path d="M61 36 v14" />
        <path d="M61 40 q-4.5 -1.5 -5.5 -5 q4.5 0.5 5.5 5 Z" />
        <path d="M61 45 q4.5 -1.5 5.5 -5 q-4.5 0.5 -5.5 5 Z" />
      </g>

      {/* Tea — leafed sprig, bottom left */}
      <g strokeWidth="1.1">
        <path d="M39 64 v13" />
        <path d="M39 68 q-4.5 -1 -5.5 -4.5 q4.5 0.5 5.5 4.5 Z" />
        <path d="M39 73 q4.5 -1 5.5 -4.5 q-4.5 0.5 -5.5 4.5 Z" />
      </g>

      {/* Wheat — ear of grain, bottom right */}
      <g strokeWidth="1.1">
        <path d="M61 63 v14" />
        <path d="M61 65 l-3.2 2 M61 65 l3.2 2 M61 69 l-3.2 2 M61 69 l3.2 2 M61 73 l-3.2 2 M61 73 l3.2 2" />
      </g>

      {/* ── Wreath of jasmine, either side ────────────────── */}
      <g strokeWidth="1.3">
        <path d="M26 36 Q13 52 19 72 Q23 85 34 92" />
        <path d="M74 36 Q87 52 81 72 Q77 85 66 92" />
      </g>
      <g strokeWidth="1" opacity="0.9">
        <path d="M22 45 q-5 -1 -6.5 -4.5 M20 55 q-5.5 -0.5 -7 -4 M19.5 65 q-5.5 0 -7 -3.5 M21 75 q-5 1 -6.5 -2.5" />
        <path d="M78 45 q5 -1 6.5 -4.5 M80 55 q5.5 -0.5 7 -4 M80.5 65 q5.5 0 7 -3.5 M79 75 q5 1 6.5 -2.5" />
      </g>

      {/* ── Scroll beneath ────────────────────────────────── */}
      <path d="M30 98 Q50 92 70 98 Q50 105 30 98 Z" strokeWidth="1.3" />
      <path d="M30 98 q-4 1.5 -5 5 q4 -1 5 -2.5 M70 98 q4 1.5 5 5 q-4 -1 -5 -2.5" strokeWidth="1.1" />
    </svg>
  );
}
