/**
 * The PathSeeker mark.
 *
 * An open book, a gold shield carrying a globe and compass needle, and an
 * arrow rising out of the pages — drawn to the supplied artwork.
 *
 * SVG rather than a raster: it stays crisp from a 22px favicon to a hero
 * lockup, costs no network request, and its golds sit in the same palette as
 * the rest of the site so it cannot drift away from it.
 *
 * @param {boolean} wordmark  render "PATH SEEKER" beneath the mark
 */
export function Logo({ size = 40, wordmark = false, title = 'PathSeeker' }) {
  const w = wordmark ? size * 2.4 : size;
  const h = wordmark ? size * 1.5 : size;

  return (
    <svg
      viewBox={wordmark ? '0 0 240 150' : '0 0 100 100'}
      width={w}
      height={h}
      role="img"
      aria-label={title}
      fill="none"
    >
      <title>{title}</title>

      <defs>
        {/* Brushed gold, lit from the top-left */}
        <linearGradient id="ps-gold" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="35%" stopColor="#f0c64e" />
          <stop offset="65%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#9a7212" />
        </linearGradient>

        {/* The book board — brighter at the spine, deeper at the fore-edge */}
        <linearGradient id="ps-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f6fe0" />
          <stop offset="55%" stopColor="#1b4bb8" />
          <stop offset="100%" stopColor="#0e2a72" />
        </linearGradient>

        <linearGradient id="ps-blue-deep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#12357f" />
          <stop offset="100%" stopColor="#0a1f52" />
        </linearGradient>
      </defs>

      <g transform={wordmark ? 'translate(70, 2) scale(0.92)' : ''}>
        {/* ── The open book ───────────────────────────────── */}
        {/* Boards behind, so the pages read as having thickness */}
        <path d="M14 22 q18 -8 36 -2 v56 q-18 -6 -36 2 Z" fill="url(#ps-blue-deep)" />
        <path d="M86 22 q-18 -8 -36 -2 v56 q18 -6 36 2 Z" fill="url(#ps-blue-deep)" />

        {/* The pages themselves, fanning from the spine */}
        <path d="M17 26 q16 -7 33 -1.5 v50 q-17 -5.5 -33 1.5 Z" fill="url(#ps-blue)" />
        <path d="M83 26 q-16 -7 -33 -1.5 v50 q17 -5.5 33 1.5 Z" fill="url(#ps-blue)" />

        {/* Page edges catching the light */}
        <path
          d="M17 26 q16 -7 33 -1.5 M83 26 q-16 -7 -33 -1.5"
          stroke="#5b93f5"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />

        {/* ── Shield ──────────────────────────────────────── */}
        <path d="M50 20 L69 27 V47 Q69 61 50 70 Q31 61 31 47 V27 Z" fill="url(#ps-gold)" />
        <path d="M50 24 L65 29.5 V47 Q65 58 50 65.5 Q35 58 35 47 V29.5 Z" fill="#1b4bb8" />

        {/* ── Globe ───────────────────────────────────────── */}
        <g stroke="url(#ps-gold)" strokeWidth="1.5" fill="none">
          <circle cx="50" cy="44" r="12" />
          <ellipse cx="50" cy="44" rx="5" ry="12" />
          <path d="M38 44h24M40 37.5h20M40 50.5h20" />
        </g>

        {/* ── Compass needle, laid across the globe ───────── */}
        <path d="M59 33 L52.5 46.5 L41 55 L47.5 41.5 Z" fill="url(#ps-gold)" />
        <circle cx="50" cy="44" r="2.4" fill="#2f6fe0" stroke="url(#ps-gold)" strokeWidth="1.2" />

        {/* ── Stars, arcing over the globe ────────────────── */}
        <g fill="url(#ps-gold)">
          <path d="M50 26.5 l1 2.2 2.4.3 -1.8 1.7.5 2.4 -2.1 -1.2 -2.1 1.2.5 -2.4 -1.8 -1.7 2.4 -.3 Z" />
          <path d="M40 29.5 l.8 1.8 2 .3 -1.5 1.4.4 2 -1.7 -1 -1.7 1 .4 -2 -1.5 -1.4 2 -.3 Z" opacity="0.9" />
          <path d="M60 29.5 l.8 1.8 2 .3 -1.5 1.4.4 2 -1.7 -1 -1.7 1 .4 -2 -1.5 -1.4 2 -.3 Z" opacity="0.9" />
        </g>

        {/* ── The rising arrow ────────────────────────────── */}
        <path
          d="M47 78 Q62 74 74 58 Q82 47 87 33"
          stroke="url(#ps-gold)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M93 22 L78 30 L90 38 Z" fill="url(#ps-gold)" />
      </g>

      {wordmark && (
        <text
          x="120"
          y="136"
          textAnchor="middle"
          fill="url(#ps-gold)"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="26"
          fontWeight="800"
          letterSpacing="2"
        >
          PATH SEEKER
        </text>
      )}
    </svg>
  );
}
