// Simple 24x24 stroke line icons for the account dashboard sidebar — a
// deliberately different (outline) style from the filled icons elsewhere
// (ShoppingBagIcon, HeartIcon), matching the brief's "sade line icon" ask.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GridIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function PackageIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20 3.5 15.8V8.2Z" />
      <path d="M3.7 8.4 12 12.3l8.3-3.9" />
      <path d="M12 12.3V20" />
      <path d="M7.7 6 16 10" />
    </svg>
  );
}

export function MapPinIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function UserIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.4-3.6 4.4-5.6 7.5-5.6s6.1 2 7.5 5.6" />
    </svg>
  );
}

export function BellIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.2 1.5 5.9H4.5C4.5 15.2 6 14 6 10Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function CheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function EyeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3.3 4" />
      <path d="M6.3 7.3C4 9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.3 0 2.5-.3 3.6-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function AlertCircleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v6" />
      <path d="M12 16.7v.1" />
    </svg>
  );
}

export function EmptyBoxIcon({ className = "h-12 w-12" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 8h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

export function LogOutIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4.5H7.8A1.8 1.8 0 0 0 6 6.3v11.4a1.8 1.8 0 0 0 1.8 1.8H15" />
      <path d="M10.5 12h9.5" />
      <path d="m17 8.5 3.5 3.5-3.5 3.5" />
    </svg>
  );
}
