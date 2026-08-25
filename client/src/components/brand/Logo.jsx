/**
 * The Career Passport mark.
 *
 * Drawn as SVG rather than loaded as a raster: it stays crisp at every size
 * from a 22px favicon to a hero lockup, costs no network request, and takes
 * its colours from the design tokens so it never drifts from the rest of the
 * site. If you want the exact PNG instead, drop it at
 * client/public/images/logo.png and swap <Logo> for an <img>.
 *
 * @param {boolean} wordmark  render "CAREER PASSPORT" beneath the mark
 */
export function Logo({ size = 40, wordmark = false, title = 'Career Passport' }) {
  const w = wordmark ? size * 2.6 : size;
  const h = wordmark ? size * 1.5 : size;

  return (
    <svg
      viewBox={wordmark ? '0 0 260 150' : '0 0 100 100'}
      width={w}
      height={h}
      role="img"
      aria-label={title}
      fill="none"
    >
      <title>{title}</title>

      <defs>
        {/* Brushed gold, light from the top-left */}
        <linearGradient id="cp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0e2b8" />
          <stop offset="38%" stopColor="#e8c766" />
          <stop offset="62%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8a6f18" />
        </linearGradient>

        {/* Passport board — deeper at the fore-edge */}
        <linearGradient id="cp-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a4b9b" />
          <stop offset="55%" stopColor="#1b3a7a" />
          <stop offset="100%" stopColor="#0f1b3c" />
        </linearGradient>

        <linearGradient id="cp-navy-deep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#16306a" />
          <stop offset="100%" stopColor="#0a1128" />
        </linearGradient>
      </defs>

      <g transform={wordmark ? 'translate(80, 4) scale(0.98)' : 'translate(0, 0)'}>
        {/* Page block behind the cover, giving the book its thickness */}
        <rect x="26" y="12" width="52" height="70" rx="6" fill="url(#cp-navy-deep)" opacity="0.75" />
        <rect x="22" y="10" width="52" height="72" rx="6" fill="url(#cp-navy-deep)" opacity="0.85" />

        {/* Cover */}
        <rect x="14" y="8" width="54" height="76" rx="7" fill="url(#cp-navy)" />
        <rect
          x="19"
          y="13"
          width="44"
          height="66"
          rx="4"
          stroke="url(#cp-gold)"
          strokeWidth="1.1"
          opacity="0.5"
        />

        {/* Open pages fanning at the foot */}
        <path
          d="M41 62 L18 76 Q17 80 21 80 L41 72 Z"
          fill="#f5f0e6"
          opacity="0.22"
        />
        <path
          d="M41 62 L64 76 Q65 80 61 80 L41 72 Z"
          fill="#f5f0e6"
          opacity="0.14"
        />

        {/* Shield */}
        <path
          d="M41 20 L58 26 V44 Q58 58 41 66 Q24 58 24 44 V26 Z"
          fill="none"
          stroke="url(#cp-gold)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Globe meridians inside the shield */}
        <g stroke="url(#cp-gold)" strokeWidth="1.1" opacity="0.85">
          <circle cx="41" cy="42" r="11" />
          <ellipse cx="41" cy="42" rx="4.6" ry="11" />
          <path d="M30 42h22M31.6 36h18.8M31.6 48h18.8" />
        </g>

        {/* Compass needle over the globe */}
        <path d="M41 31 L44.4 41.6 L41 39.4 L37.6 41.6 Z" fill="url(#cp-gold)" />
        <path d="M41 53 L37.6 42.4 L41 44.6 L44.4 42.4 Z" fill="#c9a227" opacity="0.55" />
        <circle cx="41" cy="42" r="1.9" fill="url(#cp-gold)" />

        {/* Small stars, as on the reference */}
        <g fill="url(#cp-gold)">
          <path d="M31 27 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 Z" opacity="0.9" />
          <path d="M52 30 l.8 1.9 1.9.8 -1.9.8 -.8 1.9 -.8 -1.9 -1.9 -.8 1.9 -.8 Z" opacity="0.75" />
          <path d="M35 56 l.7 1.6 1.6.7 -1.6.7 -.7 1.6 -.7 -1.6 -1.6 -.7 1.6 -.7 Z" opacity="0.6" />
        </g>

        {/* The rising arrow — the whole point of the mark */}
        <path
          d="M46 78 L84 24 L86 34 L92 20 L77 21 L84 24"
          fill="none"
          stroke="url(#cp-gold)"
          strokeWidth="0"
        />
        <path
          d="M45.5 79.5 Q60 62 88 22"
          stroke="url(#cp-gold)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M92 17 L74.5 21.5 L88.5 31.5 Z" fill="url(#cp-gold)" />
      </g>

      {wordmark && (
        <text
          x="130"
          y="132"
          textAnchor="middle"
          fill="url(#cp-gold)"
          fontFamily="Sora, system-ui, sans-serif"
          fontSize="25"
          fontWeight="600"
          letterSpacing="1.5"
        >
          CAREER PASSPORT
        </text>
      )}
    </svg>
  );
}
