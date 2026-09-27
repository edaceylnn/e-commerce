import type { ReactNode } from "react";

export function InfoPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">
        {title}
      </h1>
      <div className="prose-content mt-8 space-y-5 text-sm leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}
