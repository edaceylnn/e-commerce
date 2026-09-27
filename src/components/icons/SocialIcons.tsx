type IconProps = { className?: string };

export function InstagramIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className}>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function YoutubeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className}>
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M10.3 9.3L15 12l-4.7 2.7z" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.6 21V13.2h2.2l.3-2.6h-2.5V9c0-.75.2-1.26 1.28-1.26h1.37V5.4c-.24-.03-1.05-.1-2-.1-1.98 0-3.34 1.21-3.34 3.43v1.9H8.4v2.6h2.06V21"
        fill="currentColor"
      />
    </svg>
  );
}
