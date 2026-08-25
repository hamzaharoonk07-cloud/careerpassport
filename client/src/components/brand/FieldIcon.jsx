/**
 * Inline SVG icons for the six career fields.
 * Keyed by the `icon` value stored on each CareerField document, so adding a
 * field in the database only needs a new case here — never a new asset.
 */
const PATHS = {
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  'pen-tool': (
    <>
      <path d="M12 3 4.5 10.5 3 21l10.5-1.5L21 12z" />
      <path d="M12 3 21 12" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7" />
      <path d="M3 13h18" />
    </>
  ),
  'heart-pulse': (
    <>
      <path d="M20.4 6.6a4.6 4.6 0 0 0-6.5 0L12 8.5l-1.9-1.9a4.6 4.6 0 1 0-6.5 6.5L12 21l8.4-7.9a4.6 4.6 0 0 0 0-6.5z" />
      <path d="M3.5 12.5H8l1.6-2.6 2 4.6 1.7-3h3.4" />
    </>
  ),
  'line-chart': (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l3.5-4.2 3 2.6L21 6" />
    </>
  ),
  clapperboard: (
    <>
      <path d="M3 9.5h18V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3.6 9.5 2.4 6.1l16.4-3 1.2 3.4z" />
      <path d="m8.4 4.2 1.2 3.4M13.6 3.3l1.2 3.4" />
    </>
  ),
};

export function FieldIcon({ name, size = 24 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.briefcase}
    </svg>
  );
}
