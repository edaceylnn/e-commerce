import Image from "next/image";
import Link from "next/link";

// Home page category card: a 4:3 photo over an index number, the category
// name and its product count. `imagePosition` is the object-position that
// keeps the model's face in frame for that particular photo.
export function CategoryTile({
  href,
  label,
  image,
  imagePosition,
  index,
  count,
  className = "",
}: {
  href: string;
  label: string;
  image: string;
  imagePosition: string;
  index: number;
  count: number;
  className?: string;
}) {
  return (
    <Link href={href} className={`group flex flex-col transition hover:bg-ivory ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
        <Image
          src={image}
          alt={label}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          style={{ objectPosition: imagePosition }}
        />
      </div>
      <div className="flex flex-col gap-2 px-6 py-6">
        <span className="font-mono text-caption tracking-eyebrow text-ink-soft">
          {String(index).padStart(2, "0")}
        </span>
        <span className="font-display text-3xl">{label}</span>
        <span className="font-sans text-xs font-medium tracking-label text-accent">
          {count} ÜRÜN →
        </span>
      </div>
    </Link>
  );
}
