export function HeartIcon({
  filled = false,
  className = "",
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M12 20.25c-.3 0-.59-.1-.82-.29C7.9 17.4 3 13.14 3 8.86 3 6.05 5.19 3.9 7.9 3.9c1.56 0 3.04.78 3.98 2.02a.14.14 0 0 0 .24 0 4.93 4.93 0 0 1 3.98-2.02c2.71 0 4.9 2.15 4.9 4.96 0 4.28-4.9 8.54-8.18 11.1-.23.19-.52.29-.82.29Z" />
    </svg>
  );
}
