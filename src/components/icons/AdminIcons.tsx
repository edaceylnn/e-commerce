// Same 24x24 stroke line style as AccountIcons.tsx, extended for glyphs the
// admin back-office needs that don't already exist in that set (e.g. Orders
// needs its own icon since PackageIcon is already claimed by Products).
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function TruckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="7" width="11" height="9" rx="1.2" />
      <path d="M13.5 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
    </svg>
  );
}

export function TagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 4h5.8a1.2 1.2 0 0 1 1.2 1.2v5.8a1.2 1.2 0 0 1-.35.85l-8 8a1.2 1.2 0 0 1-1.7 0l-5.5-5.5a1.2 1.2 0 0 1 0-1.7l8-8a1.2 1.2 0 0 1 .55-.65Z" />
      <circle cx="15" cy="9" r="1.4" />
    </svg>
  );
}

export function ChatBubbleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5.5h16v10.5H9l-4 3.5v-3.5H4Z" />
    </svg>
  );
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </svg>
  );
}

export function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 5.5 18.5 18.5" />
      <path d="M18.5 5.5 5.5 18.5" />
    </svg>
  );
}

export function PencilIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M15.5 4.5 19.5 8.5 8 20H4v-4Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </svg>
  );
}

export function BadgeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="m8.5 14 -1.5 6 4-2 1 2 1-2 4 2-1.5-6" />
    </svg>
  );
}

export function TrashIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7h14" />
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
      <path d="M10.3 11v6" />
      <path d="M13.7 11v6" />
    </svg>
  );
}

export function PaletteIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 3.3 2.6 4.2 4.3 4.2.8 0 1-.4 1-.9 0-.4-.3-.8-.3-1.3 0-1 .8-1.8 1.9-1.8h2c2.5 0 4.6-1.9 4.6-4.4 0-2.2-2.2-3.8-5-3.8Z" />
      <circle cx="8.2" cy="10.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="8.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RulerIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="8.5" width="18" height="7" rx="1.2" transform="rotate(0 12 12)" />
      <path d="M7 8.5v2.2" />
      <path d="M10.3 8.5v2.2" />
      <path d="M13.7 8.5v2.2" />
      <path d="M17 8.5v2.2" />
    </svg>
  );
}

export function SizeChartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="4" width="17" height="16" rx="1.2" />
      <path d="M3.5 9.5h17" />
      <path d="M9 9.5V20" />
      <path d="M14.5 9.5V20" />
    </svg>
  );
}

export function GearIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.55 1.55M7.85 16.15 6.3 17.7M17.7 17.7l-1.55-1.55M7.85 7.85 6.3 6.3" />
    </svg>
  );
}

export function LedgerIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3.5h9.5L19 7v13.5H6Z" />
      <path d="M15.5 3.5V7H19" />
      <path d="M8.5 11.5h7" />
      <path d="M8.5 14.5h7" />
      <path d="M8.5 17.5h4.5" />
    </svg>
  );
}

export function MailIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 6.5 8 6 8-6" />
    </svg>
  );
}
