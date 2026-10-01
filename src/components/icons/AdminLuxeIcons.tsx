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

export function DownloadIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.5v11.5" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M4.5 18.5h15" />
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
