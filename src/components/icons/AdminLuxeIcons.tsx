// Hand-rolled icons for the admin "Luxe Cosmetics Dashboard" theme, matching
// the stroke-icon convention in AccountIcons.tsx/AdminIcons.tsx (24x24,
// stroke=currentColor). Named after the Material Symbols glyphs they stand
// in for, since the reference design used Google's Material Symbols font —
// this project hand-draws icons instead of pulling in an icon-font dependency.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function WarehouseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-4h6v4" />
    </svg>
  );
}

export function GroupIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c1.1-3 3.2-4.6 5.5-4.6s4.4 1.6 5.5 4.6" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.7c1.9.4 3.4 1.8 4.2 4.3" />
    </svg>
  );
}

export function CategoryGridIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function CalendarIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.5v11.5" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M4.5 18.5h15" />
    </svg>
  );
}

export function PaymentsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="6" width="15" height="10.5" rx="2" />
      <ellipse cx="17.5" cy="11.25" rx="4" ry="5.25" />
    </svg>
  );
}

export function ClockIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m3.5 16 6-6 4 4 7-7.5" />
      <path d="M15.5 6h5v5" />
    </svg>
  );
}

export function PersonAddIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.5 19c1.2-3.4 3.1-4.8 5.5-4.8s4.3 1.4 5.5 4.8" />
      <path d="M18.5 8v6M15.5 11h6" />
    </svg>
  );
}

export function WarningTriangleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AddShoppingCartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9.5" cy="20" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20" r="1.1" fill="currentColor" stroke="none" />
      <path d="M2.5 4h2.4l2 11h11l1.8-7H7.3" />
      <path d="M16.5 3.5v5M14 6h5" />
    </svg>
  );
}

export function MedalIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="14" r="6" />
      <path d="M9 4.5 12 9l3-4.5" />
      <path d="M8 4.5h8" />
      <path d="M12 11.3 13.1 13.4 15.5 13.7 13.75 15.3 14.2 17.7 12 16.5 9.8 17.7 10.25 15.3 8.5 13.7 10.9 13.4Z" />
    </svg>
  );
}

export function EyeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M9.9 5.7A10.5 10.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.5 13.5 0 0 1-3 3.6M6.3 7.4A13.6 13.6 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6" />
      <path d="M9.9 10.3a2.6 2.6 0 0 0 3.6 3.6" />
    </svg>
  );
}

export function PlusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function SubArrowIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4v8a3 3 0 0 0 3 3h9" />
      <path d="m14 11 4 4-4 4" />
    </svg>
  );
}

export function SortIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 5v14M6 5l-3 3M6 5l3 3" />
      <path d="M18 19V5M18 19l-3-3M18 19l3-3" />
    </svg>
  );
}

export function SyncIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" />
      <path d="M20 4.5v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" />
      <path d="M4 19.5v-4h4" />
    </svg>
  );
}

export function AccountTreeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="6" height="4.5" rx="1" />
      <rect x="15" y="4" width="6" height="4.5" rx="1" />
      <rect x="9" y="15.5" width="6" height="4.5" rx="1" />
      <path d="M6 8.5v4a2 2 0 0 0 2 2h1M18 8.5v4a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

export function BarChartIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function SparklesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.5 13.3 8 17.5 9.3 13.3 10.6 12 15.1 10.7 10.6 6.5 9.3 10.7 8Z" />
      <path d="M18.5 14.5 19.2 17 21.5 17.7 19.2 18.4 18.5 20.8 17.8 18.4 15.5 17.7 17.8 17Z" />
    </svg>
  );
}
