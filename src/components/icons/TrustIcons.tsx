type IconProps = { className?: string };

export function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className={className}>
      <path
        d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TruckIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className={className}>
      <path d="M2.5 6.5h11v9h-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M13.5 9.5h3.3l3.2 3.2v2.8h-6.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ReturnIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className={className}>
      <path
        d="M4 11a8 8 0 1 1 2.2 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M4 6.5V11h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
