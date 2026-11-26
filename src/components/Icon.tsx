/** Small outline icons drawn for this prototype (generic shapes, not Claude's icon font). */
const paths: Record<string, React.ReactNode> = {
  sidebar: <><rect x="3" y="4.5" width="14" height="11" rx="2.5" /><path d="M7.5 4.5v11" /></>,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  search: <><circle cx="9" cy="9" r="4.7" /><path d="M12.5 12.5l3.3 3.3" /></>,
  projects: <><rect x="4" y="8" width="12" height="8" rx="2" /><path d="M5.5 5.5h9M7 3.2h6" /></>,
  artifacts: <><rect x="3.5" y="6.5" width="8" height="10" rx="2" /><path d="M8.5 6.5V5a1.5 1.5 0 011.5-1.5h5A1.5 1.5 0 0116.5 5v7a1.5 1.5 0 01-1.5 1.5h-3.5" /></>,
  teammate: <><circle cx="7.5" cy="10" r="4.3" /><circle cx="12.5" cy="10" r="4.3" /></>,
  customize: <><rect x="3.5" y="6.5" width="13" height="9.5" rx="2" /><path d="M7.5 6.5V5.2A1.2 1.2 0 018.7 4h2.6a1.2 1.2 0 011.2 1.2v1.3" /></>,
  chat: <path d="M4 6.2A2.2 2.2 0 016.2 4h7.6A2.2 2.2 0 0116 6.2v5.1a2.2 2.2 0 01-2.2 2.2H9.3L6 16v-2.5A2.2 2.2 0 014 11.3V6.2z" />,
  code: <path d="M7.5 6.5L4 10l3.5 3.5M12.5 6.5L16 10l-3.5 3.5M11 5l-2 10" />,
  chevron: <path d="M6.5 8.5L10 12l3.5-3.5" />,
  share: <path d="M10 12.5V4M10 4L7 7M10 4l3 3M4.5 11v3.3A1.7 1.7 0 006.2 16h7.6a1.7 1.7 0 001.7-1.7V11" />,
  mic: <><rect x="7.7" y="3" width="4.6" height="8.5" rx="2.3" /><path d="M5 10a5 5 0 0010 0M10 15v2.2" /></>,
  enter: <path d="M15.5 5v4.5a2 2 0 01-2 2H5M5 11.5l3-3M5 11.5l3 3" />,
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}
