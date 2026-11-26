/** Placeholder mark: two overlapping rings, one per participant. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="12" r="6.5" stroke="var(--person)" strokeWidth="2" />
      <circle cx="15" cy="12" r="6.5" stroke="var(--agent)" strokeWidth="2" />
    </svg>
  );
}
