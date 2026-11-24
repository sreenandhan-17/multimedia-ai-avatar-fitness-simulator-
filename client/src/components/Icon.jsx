// Small inline-SVG icon set. No icon library, no emoji, no image files.
// 24x24 grid, stroke-only (no fill), so every icon follows the current
// theme's text/accent colour via currentColor. Purely decorative: the
// sentence next to each icon always carries the actual meaning.

const PATHS = {
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  ruler: (
    <>
      <path d="M4 12h16" />
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  'play-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  copy: (
    <>
      <rect x="4" y="8" width="12" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  message: <path d="M4 5h16v10H10l-4 4v-4H4z" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6.5" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 3.5l9 15.5H3z" />
      <path d="M12 9.5v4" />
      <path d="M12 17v0.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8v0.01" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M21 6H7a4 4 0 0 0-4 4v2" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M3 18h14a4 4 0 0 0 4-4v-2" />
    </>
  ),
  check: <path d="M4 12.5l5 5 11-11" />,
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  redo: (
    <>
      <path d="M20 9a8 8 0 1 0 2 5.3" />
      <path d="M22 4v6h-6" />
    </>
  ),
  shield: <path d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7z" />,
  stop: <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />,
  'heart-pulse': (
    <>
      <path d="M12 20.5s-7-4.2-9.3-8.3C1.2 9 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.3 0 4.8 3.8 3.3 7-.6 1.1-1.5 2.1-2.6 3.1" />
      <path d="M4.5 12h3l1.5-2.5 2 4 1.5-2.5h3" />
    </>
  ),
  chest: (
    <>
      <rect x="5" y="6" width="14" height="12" rx="3" />
      <path d="M5 11h14" />
    </>
  ),
  arms: (
    <>
      <rect x="4" y="9" width="3" height="6" rx="1" />
      <rect x="17" y="9" width="3" height="6" rx="1" />
      <path d="M7 12h10" />
    </>
  ),
  back: (
    <>
      <path d="M12 3v18" />
      <path d="M7 7h10M7 12h10M7 17h10" />
    </>
  ),
  shoulders: (
    <>
      <circle cx="7" cy="8" r="2" />
      <circle cx="17" cy="8" r="2" />
      <path d="M4 17c0-4 3-6 8-6s8 2 8 6" />
    </>
  ),
  legs: <path d="M9 3v8l-3 10M15 3v8l3 10" />,
  abdomen: (
    <>
      <rect x="7" y="5" width="10" height="14" rx="3" />
      <path d="M9 9h6M9 13h6M9 17h6" />
    </>
  ),
  'arrow-left': (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

export default function Icon({ name, size = 24, className = '' }) {
  const paths = PATHS[name];

  if (!paths) {
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
