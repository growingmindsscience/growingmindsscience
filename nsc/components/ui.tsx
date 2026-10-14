import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "ghost" | "on-dark";
export type ButtonSize = "md" | "sm";

// Terrain buttons (DESIGN.md): square, one fill, feedback on press only. At
// least 48px tall, Geologica 600, with a 1.5px border matching the fill so
// every variant is the same size; `:active` moves down 1px, nothing lifts and
// nothing casts a shadow. The focus ring is the global teal outline
// (globals.css). The border color lives in each variant: two border-color
// utilities on one element resolve by stylesheet order, not attribute order.
const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-control border-[1.5px] font-display font-semibold leading-tight no-underline transition-[background-color,color,border-color] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-12 px-[1.4rem] py-3 text-base",
  sm: "min-h-12 px-4 py-2 text-sm",
};

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // The action on light grounds: the teal route, deepening on hover.
  primary: "border-teal bg-teal text-on-teal hover:border-teal-hover hover:bg-teal-hover",
  // Quiet: a 1.5px ink border and ink text for the second action; hover inverts.
  ghost: "border-ink bg-transparent text-ink hover:bg-ink hover:text-ground",
  // On a navy field (add `ink-band` to the band): the on-dark fill with navy text, pure white on hover.
  "on-dark": "border-on-dark bg-on-dark text-ink-900 hover:border-white hover:bg-white",
};

/**
 * Button classes. Color comes only from `variant` and size only from
 * `size`; `className` is for layout (margins, width). Tailwind
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

/**
 * A panel: a surface with a 3px ink rule across its top (the legend bar),
 * square, with no side borders and no shadow (a form, a progress card).
 * Lists of parallel things are ruled rows instead (see ClassOutline).
 */
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
        "rounded-card border-t-[3px] border-ink p-6",
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
  /** Rendered with id `${htmlFor}-hint`; point the input's aria-describedby at it. */
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-display text-sm font-medium text-ink-deep">
        {label}
      </label>
      {children}
      {hint && <p id={`${htmlFor}-hint`} className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Sheet-colored field with a 1.5px visible edge, square, and a teal focus ring (DESIGN.md, Inputs). */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "min-h-12 rounded-control border-[1.5px] border-field-line bg-ground px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-teal focus-visible:outline-teal",
        className,
      )}
      {...props}
    />
  );
}

/** Static neutral enrichment footer — rendered on every readout (spec §3.1.6). */
export function EnrichmentFooter({ text }: { text: string }) {
  return (
    <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-ink-muted">
      {text}
    </p>
  );
}
