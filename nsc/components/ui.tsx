import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground disabled:opacity-50",
        variant === "primary" && "bg-teal text-white hover:bg-teal-soft",
        variant === "ghost" && "bg-transparent text-teal hover:bg-sea-glass/40",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "ghost" }) {
  return (
    <Link
      className={cx(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
        variant === "primary" && "bg-teal text-white hover:bg-teal-soft",
        variant === "ghost" && "bg-transparent text-teal hover:bg-sea-glass/40",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  // Tailwind resolves conflicting utilities by stylesheet order, not attribute
  // order, so a caller's bg-* override can silently lose to bg-surface. Yield
  // the default background whenever the caller brings their own.
  const hasBgOverride = /(^|\s)bg-/.test(className ?? "");
  return (
    <div
      className={cx(
        "rounded-2xl border border-sea-glass/60 p-6 shadow-sm",
        !hasBgOverride && "bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-teal-soft">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "rounded-xl border border-sea-glass bg-surface px-4 py-3 text-base text-ink placeholder:text-teal-soft/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30",
        className,
      )}
      {...props}
    />
  );
}

/** Static neutral enrichment footer — rendered on every readout (spec §3.1.6). */
export function EnrichmentFooter({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-teal-soft">
      {text}
    </p>
  );
}
