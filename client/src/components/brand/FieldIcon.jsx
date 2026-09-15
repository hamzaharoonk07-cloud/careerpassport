/**
 * Inline SVG icons for the career fields.
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
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
      <circle cx="12" cy="12" r="6.5" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
      <path d="M7.2 15h9.6" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5V20" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M7 21h10M4 7h16" />
      <path d="M6.5 7 3.5 13.5a3 3 0 0 0 6 0zM17.5 7l-3 6.5a3 3 0 0 0 6 0z" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 9.5 12 4l9 5.5M4 21h16M5.5 10.5v8M9.5 10.5v8M14.5 10.5v8M18.5 10.5v8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="10" height="18" rx="1" />
      <path d="M15 9h4v12h-4M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1M9 21v-3h2v3" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-14 15-15 0 9-5 15-13 15" />
      <path d="M5 19c3-4 6-7 10-9.5" />
    </>
  ),
  bell: (
    <>
      <path d="M4 17h16M5.5 17a6.5 6.5 0 0 1 13 0M12 10.5V8M10.5 8h3M3 20h18" />
    </>
  ),
  plane: (
    <path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" />
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4M12 14v3M8.5 21h7M9.5 17h5v4h-5z" />
    </>
  ),
  hands: (
    <>
      <path d="M12 20.5s-7-4.2-7-9.2A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 7 2.3c0 5-7 9.2-7 9.2z" />
      <path d="M8.5 5.5a2 2 0 1 0 0-.1M15.5 5.5a2 2 0 1 0 0-.1" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7.5 20 17M8 16.5 20 7" />
    </>
  ),
  wrench: (
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2zM14.5 6.5l3-3 3 3-3 3" />
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
