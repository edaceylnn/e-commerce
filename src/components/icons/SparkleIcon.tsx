type IconProps = { className?: string };

export function SparkleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2c.6 3.6 1.4 5.9 2.6 7.4 1.2 1.2 3.5 2 7.4 2.6-3.6.6-5.9 1.4-7.4 2.6-1.2 1.2-2 3.5-2.6 7.4-.6-3.6-1.4-5.9-2.6-7.4C8.2 13.4 5.9 12.6 2 12c3.6-.6 5.9-1.4 7.4-2.6C10.6 8.2 11.4 5.9 12 2Z" />
      <path d="M19 2.5c.28 1.5.63 2.5 1.1 3 .5.47 1.5.82 3 1.1-1.5.28-2.5.63-3 1.1-.47.5-.82 1.5-1.1 3-.28-1.5-.63-2.5-1.1-3-.5-.47-1.5-.82-3-1.1 1.5-.28 2.5-.63 3-1.1.47-.5.82-1.5 1.1-3Z" />
    </svg>
  );
}
