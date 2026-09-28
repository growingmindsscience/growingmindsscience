import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "ghost" | "inverse";
export type ButtonSize = "md" | "sm";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ground disabled:opacity-50";

// Pills are 48px (DESIGN.md); the compact size still clears a 44px target.
const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-12 px-6 py-3 text-base",
  sm: "min-h-11 px-4 py-2 text-sm",
};

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-teal text-white hover:bg-teal-soft",
  ghost: "bg-transparent text-teal hover:bg-sea-glass/40",
  // A light pill for dark (pine) cards.
  inverse: "bg-white text-ink-deep hover:bg-sea-glass",
};

/**
 * Button classes. Color comes only from `variant` and size only from
 * `size`; `className` is for layout (margins, width, a border). Tailwind
 * resolves conflicting utilities by stylesheet order, not attribute order,
 * so a color or padding override passed through `className` silently loses
 * (that is how "See the price" rendered white text on a white pill).
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(BUTTON_BASE, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
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
        "min-h-11 rounded-xl border border-sea-glass bg-surface px-4 py-3 text-base text-ink placeholder:text-teal-soft/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30",
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
