/**
 * The Career Passport mark: a compass rose whose needle points off-centre.
 * Drawn as inline SVG so it inherits currentColor and costs no request.
 */
export function CompassMark({ size = 40, title }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
    >
      {title && <title>{title}</title>}
      <circle cx="24" cy="24" r="18" opacity="0.55" />
      <circle cx="24" cy="24" r="13.5" opacity="0.28" />
      {/* Needle — deliberately off true north: you are not there yet */}
      <path d="M24 10.5 L28.6 25.4 L24 22.2 L19.4 25.4 Z" fill="currentColor" stroke="none" />
      <path d="M24 37.5 L19.4 22.6 L24 25.8 L28.6 22.6 Z" fill="currentColor" opacity="0.32" stroke="none" />
      <circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none" />
      <path d="M24 4.5v3M24 40.5v3M4.5 24h3M40.5 24h3" opacity="0.6" />
    </svg>
  );
}
