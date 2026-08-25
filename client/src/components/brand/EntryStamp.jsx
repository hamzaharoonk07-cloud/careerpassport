/**
 * An immigration entry stamp.
 *
 * What makes a real stamp read as real, and what a flat circle of text
 * misses entirely:
 *
 *   · the country curves around the top of the ring, the port around the
 *     bottom, both following the circle rather than sitting flat
 *   · a double ring with a hairline gap, the way a die is cut
 *   · the date is the largest element, because on a real stamp it is
 *   · the ink is uneven — heavier where the die bit, broken where it lifted
 *   · nothing is perfectly centred, and the whole thing sits off-square
 *
 * Rendered as SVG so it stays crisp at any size and the ink mask can be
 * applied to the artwork rather than to a box around it.
 */
export function EntryStamp({
  size = 190,
  country = 'ISLAMIC REPUBLIC OF PAKISTAN',
  port = 'KARACHI · JINNAH INTL',
  date = new Date(),
  status = 'ADMITTED',
  colour = '#2e7d5b',
  seed = 0,
}) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();

  // A stable per-stamp wobble, so two stamps on one page are not identical
  // but a given stamp does not jitter between renders.
  const tilt = -9 + ((seed * 37) % 11);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${status} at ${port}, ${day} ${month} ${year}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <title>{`${status} — ${port}`}</title>

      <defs>
        {/* The ink is never solid. This breaks the artwork up so the die
            reads as pressed rather than printed. */}
        <mask id="stamp-ink">
          <rect width="200" height="200" fill="#fff" />
          <g fill="#000">
            <ellipse cx="52" cy="44" rx="26" ry="15" opacity="0.5" />
            <ellipse cx="158" cy="132" rx="30" ry="17" opacity="0.42" />
            <ellipse cx="96" cy="176" rx="34" ry="11" opacity="0.35" />
            <circle cx="140" cy="52" r="9" opacity="0.3" />
            <circle cx="38" cy="118" r="11" opacity="0.28" />
          </g>
        </mask>

        {/* Paths the curved text rides on */}
        <path id="stamp-top" d="M 100 100 m -72 0 a 72 72 0 0 1 144 0" fill="none" />
        <path id="stamp-bottom" d="M 100 100 m -62 0 a 62 62 0 0 0 124 0" fill="none" />
      </defs>

      <g mask="url(#stamp-ink)" fill={colour} stroke={colour}>
        {/* Double ring, cut the way a die is */}
        <circle cx="100" cy="100" r="92" fill="none" strokeWidth="3.5" />
        <circle cx="100" cy="100" r="84" fill="none" strokeWidth="1.4" opacity="0.85" />

        {/* Country, arced along the top */}
        <text
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="13"
          fontWeight="500"
          letterSpacing="2.2"
          stroke="none"
        >
          <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">
            {country}
          </textPath>
        </text>

        {/* Port of entry, arced along the bottom */}
        <text
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="11"
          fontWeight="500"
          letterSpacing="1.8"
          stroke="none"
        >
          <textPath href="#stamp-bottom" startOffset="50%" textAnchor="middle">
            {port}
          </textPath>
        </text>

        {/* Aircraft glyph — the mark of an air port of entry */}
        <g transform="translate(100 56) scale(0.9)" stroke="none">
          <path d="M0 -13 L3 -4 L20 4 L20 8 L3 4.5 L2 12 L7 16 L7 18 L0 16 L-7 18 L-7 16 L-2 12 L-3 4.5 L-20 8 L-20 4 L-3 -4 Z" />
        </g>

        {/* The date, which is what a stamp is actually for */}
        <g stroke="none" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">
          <line x1="42" y1="86" x2="158" y2="86" strokeWidth="1.6" stroke={colour} />
          <text x="100" y="112" fontSize="30" fontWeight="500" letterSpacing="1.5">
            {`${day} ${month} ${year}`}
          </text>
          <line x1="42" y1="124" x2="158" y2="124" strokeWidth="1.6" stroke={colour} />

          <text x="100" y="146" fontSize="16" fontWeight="500" letterSpacing="4">
            {status}
          </text>
        </g>
      </g>
    </svg>
  );
}
