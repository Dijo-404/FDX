const PATHS = {
  dashboard: "M4 4h6v7H4V4Zm10 0h6v4h-6V4ZM4 14h6v6H4v-6Zm10-3h6v9h-6v-9Z",
  colleges: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6",
  users: "M16 14a4 4 0 1 0-8 0M6 21a6 6 0 0 1 12 0M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  logs: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  students: "M22 10 12 5 2 10l10 5 10-5Zm-4 2v5c0 1-2.7 3-6 3s-6-2-6-3v-5",
  events: "M8 2v4M16 2v4M3.5 9h17M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  face: "M9 10h.01M15 10h.01M8 15c1 1.2 2.4 2 4 2s3-.8 4-2M4 7V5a2 2 0 0 1 2-2h2M4 17v2a2 2 0 0 0 2 2h2M20 7V5a2 2 0 0 0-2-2h-2M20 17v2a2 2 0 0 1-2 2h-2",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35",
  chevron: "m6 9 6 6 6-6",
  storage: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
