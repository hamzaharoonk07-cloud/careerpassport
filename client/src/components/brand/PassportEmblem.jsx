import { useId } from 'react';

/**
 * The foil emblem blocked on the Career Passport cover.
 *
 * PathSeeker's own device, not a state emblem: a ring of lettering around an
 * eight-point compass rose, with an aircraft crossing it on a climbing line.
 * Drawn in currentColor so the cover's foil treatment colours it.
 */
export function PassportEmblem({ size = 120, ring = 'PATHSEEKER · CAREER AUTHORITY · PATHSEEKER · CAREER AUTHORITY · ' }) {
  const id = useId().replace(/:/g, '');
  const star = (r, R, n = 8, rot = -90) =>
    Array.from({ length: n * 2 }, (_, i) => {
      const a = ((rot + (i * 180) / n) * Math.PI) / 180;
      const rad = i % 2 === 0 ? R : r;
      return `${50 + rad * Math.cos(a)},${50 + rad * Math.sin(a)}`;
    }).join(' ');

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ maxWidth: 'none' }}>
      <defs>
        <path id={`ring-${id}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>

      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1.6" />
      <circle cx="50" cy="50" r="31.5" fill="none" stroke="currentColor" strokeWidth="0.9" />

      <text fill="currentColor" style={{ fontSize: '6.1px', fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Stretched to exactly one circumference (2π × 38), so the lettering
            closes on itself instead of overlapping where it meets. */}
        <textPath href={`#ring-${id}`} startOffset="0" textLength="238.76" lengthAdjust="spacing">{ring}</textPath>
      </text>

      {/* Compass rose: a long four-point star over a short one */}
      <polygon points={star(4, 17, 4, -90)} fill="currentColor" opacity="0.4" transform="rotate(45 50 50)" />
      <polygon points={star(5, 27, 4, -90)} fill="currentColor" />
      <circle cx="50" cy="50" r="3.6" fill="none" stroke="#08361f" strokeWidth="1.4" />

      {/* The flight: a climbing dashed line and the aircraft at its head */}
      <path d="M26 68 Q44 62 64 40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
      <path
        d="M72.5 31.5 l-2.2 7.2 -3.1-1.9 -3.9 4.7 -1.2-0.6 2.2-5.4 -3.6-2 0.3-1.4 3.9 0.6 2-4.1 1.3 0.1 -0.2 4.3 3.4 0.9z"
        fill="currentColor"
      />
    </svg>
  );
}

/** The chip symbol printed on electronic passports: a rectangle between two arcs around a circle. */
export function ChipMark({ size = 28 }) {
  return (
    <svg viewBox="0 0 40 26" width={size * 1.54} height={size} aria-hidden="true" style={{ maxWidth: 'none' }}>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="36" height="22" rx="2" />
        <path d="M2 13h11M27 13h11" />
        <circle cx="20" cy="13" r="6" />
      </g>
    </svg>
  );
}
