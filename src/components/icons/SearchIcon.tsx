type IconProps = { className?: string };

export function SearchIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m20.5 20.5-4.7-4.7" />
    </svg>
  );
}
